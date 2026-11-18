from __future__ import annotations

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify
from rest_framework.exceptions import ValidationError

from .models import ActivityComment, Column, Sprint, Task, Workspace

COLUMN_TITLES = ['Backlog', 'Todo', 'In Progress', 'In Review', 'Done']


def next_issue_key(workspace: Workspace, prefix: str = 'NEX') -> str:
    """Return the next issue key for a workspace, e.g. NEX-130."""
    existing = Task.objects.filter(
        column__sprint__workspace=workspace
    ).values_list('issue_key', flat=True)

    highest = 100
    for key in existing:
        try:
            highest = max(highest, int(key.rsplit('-', 1)[-1]))
        except (AttributeError, ValueError):
            continue

    candidate = highest + 1
    while Task.objects.filter(
        column__sprint__workspace=workspace,
        issue_key=f'{prefix}-{candidate}',
    ).exists():
        candidate += 1
    return f'{prefix}-{candidate}'


def create_columns(sprint: Sprint) -> list[Column]:
    """Create the canonical five columns for a sprint."""
    return [
        Column.objects.create(
            sprint=sprint,
            title=title,
            slug=Column.SLUG_BY_TITLE[title],
            position=position,
        )
        for position, title in enumerate(COLUMN_TITLES)
    ]


def unique_workspace_slug(name: str) -> str:
    base = slugify(name) or 'workspace'
    candidate = base
    suffix = 2
    while Workspace.objects.filter(slug=candidate).exists():
        candidate = f'{base}-{suffix}'
        suffix += 1
    return candidate


def ensure_starter_workspace(user) -> Workspace:
    """Return the user's workspace, bootstrapping an empty one when needed."""
    existing = Workspace.objects.filter(owner=user).order_by('id').first()
    if existing:
        return existing

    with transaction.atomic():
        display_name = user.get_full_name().strip() or user.username
        workspace = Workspace.objects.create(
            name=f'{display_name} Workspace',
            slug=unique_workspace_slug(f'{display_name} Workspace'),
            owner=user,
            is_demo_sandbox=False,
        )
        today = timezone.localdate()
        sprint = Sprint.objects.create(
            workspace=workspace,
            name='Sprint 1',
            status=Sprint.Status.ACTIVE,
            start_date=today,
            end_date=today + timedelta(days=14),
        )
        create_columns(sprint)
    return workspace


def log_system(task: Task, actor, content: str) -> ActivityComment:
    return ActivityComment.objects.create(
        task=task,
        author=actor,
        content=content,
        is_system_log=True,
    )


@transaction.atomic
def move_task(
    task: Task,
    target_column: Column,
    new_position: int,
    actor,
) -> Task:
    """
    Move a task into a target column at a 0-based position.

    Positions in both the source and destination columns are renumbered in a
    single transaction, so concurrent drags cannot leave duplicate or sparse
    integer positions behind.
    """
    locked_task = (
        Task.objects.select_for_update()
        .select_related('column', 'column__sprint', 'column__sprint__workspace')
        .get(pk=task.pk)
    )
    locked_target = (
        Column.objects.select_for_update()
        .select_related('sprint')
        .get(pk=target_column.pk)
    )

    if locked_target.sprint_id != locked_task.column.sprint_id:
        raise ValidationError(
            {'target_column_id': 'The target column must belong to the task sprint.'}
        )

    source_column = locked_task.column
    source_siblings = list(
        Task.objects.select_for_update()
        .filter(column=source_column)
        .exclude(pk=locked_task.pk)
        .order_by('position', 'id')
    )
    target_siblings = list(
        Task.objects.select_for_update()
        .filter(column=locked_target)
        .exclude(pk=locked_task.pk)
        .order_by('position', 'id')
    )

    requested_position = max(0, int(new_position))
    clamped_position = min(requested_position, len(target_siblings))
    target_sequence = (
        target_siblings[:clamped_position]
        + [locked_task]
        + target_siblings[clamped_position:]
    )

    locked_task.column = locked_target
    locked_task.position = clamped_position
    locked_task.save(update_fields=['column', 'position', 'updated_at'])

    pending_updates: list[Task] = []

    if source_column.pk == locked_target.pk:
        for index, sibling in enumerate(target_sequence):
            if sibling.pk == locked_task.pk:
                continue
            if sibling.position != index:
                sibling.position = index
                pending_updates.append(sibling)
    else:
        for index, sibling in enumerate(source_siblings):
            if sibling.position != index:
                sibling.position = index
                pending_updates.append(sibling)
        for index, sibling in enumerate(target_sequence):
            if sibling.pk == locked_task.pk:
                continue
            if sibling.position != index:
                sibling.position = index
                pending_updates.append(sibling)

    if pending_updates:
        Task.objects.bulk_update(pending_updates, ['position'], batch_size=100)

    if source_column.pk != locked_target.pk:
        log_system(
            locked_task,
            actor,
            f'moved this issue from {source_column.title} to {locked_target.title}',
        )

    return locked_task
