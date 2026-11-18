"""Reusable demo data for the recruiter sandbox and seed_nexora command."""
from __future__ import annotations

from collections import defaultdict
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from .models import ActivityComment, Column, Sprint, Task, Workspace
from .services import create_columns, unique_workspace_slug

DEMO_USERNAME = 'recruiter-demo'
DEMO_EMAIL = 'demo@nexora.dev'
DEMO_PASSWORD = 'nexora-demo'
DEMO_WORKSPACE_NAME = 'Nexora Core Engineering'

TEAM = (
    {
        'alias': 'alex',
        'username': DEMO_USERNAME,
        'first_name': 'Alex',
        'last_name': 'Chen',
        'email': DEMO_EMAIL,
    },
    {
        'alias': 'priya',
        'username': 'priya',
        'first_name': 'Priya',
        'last_name': 'Sharma',
        'email': 'priya@nexora.dev',
    },
    {
        'alias': 'marcus',
        'username': 'marcus',
        'first_name': 'Marcus',
        'last_name': 'Johnson',
        'email': 'marcus@nexora.dev',
    },
    {
        'alias': 'sofia',
        'username': 'sofia',
        'first_name': 'Sofia',
        'last_name': 'Rossi',
        'email': 'sofia@nexora.dev',
    },
    {
        'alias': 'daniel',
        'username': 'daniel',
        'first_name': 'Daniel',
        'last_name': 'Kim',
        'email': 'daniel@nexora.dev',
    },
    {
        'alias': 'lena',
        'username': 'lena',
        'first_name': 'Lena',
        'last_name': 'Fischer',
        'email': 'lena@nexora.dev',
    },
    {
        'alias': 'tomas',
        'username': 'tomas',
        'first_name': 'Tomás',
        'last_name': 'Silva',
        'email': 'tomas@nexora.dev',
    },
)


def ensure_team() -> dict[str, object]:
    """Create the demo team and return a lookup keyed by alias."""
    User = get_user_model()
    users: dict[str, object] = {}

    for member in TEAM:
        user, created = User.objects.get_or_create(
            username=member['username'],
            defaults={
                'first_name': member['first_name'],
                'last_name': member['last_name'],
                'email': member['email'],
            },
        )
        changed = False
        for field in ('first_name', 'last_name', 'email'):
            if getattr(user, field) != member[field]:
                setattr(user, field, member[field])
                changed = True

        if member['alias'] == 'alex':
            user.set_password(DEMO_PASSWORD)
            changed = True
        elif created:
            user.set_unusable_password()

        if created or changed:
            user.save()
        users[member['alias']] = user

    return users


SPRINT_14_TASKS = [
    {
        'key': 'NEX-118',
        'title': 'Add SSO provisioning hooks for enterprise workspaces',
        'description': (
            'Lay the groundwork for SCIM and Just-in-Time provisioning in enterprise plans.\n\n'
            '- Add a workspace-level SSO configuration model\n'
            '- Expose SCIM user and group endpoints behind a feature flag\n'
            '- Map IdP groups to workspace roles\n'
            '- Emit audit events for every provisioning change'
        ),
        'column': 'backlog',
        'priority': 'high',
        'label': 'Backend',
        'points': 8,
        'assignee': 'marcus',
        'created_by': 'daniel',
        'created_days_ago': 8,
    },
    {
        'key': 'NEX-124',
        'title': 'Audit GraphQL query cost for board subscriptions',
        'description': (
            'Board subscriptions fetch more fields than the UI renders, especially on mobile.\n\n'
            '- Measure query cost per board load\n'
            '- Trim unused nested issue fields from the subscription\n'
            '- Cap subscription payloads during large drag operations\n'
            '- Publish a before/after p95 latency report'
        ),
        'column': 'backlog',
        'priority': 'medium',
        'label': 'API',
        'points': 5,
        'assignee': 'tomas',
        'created_by': 'tomas',
        'created_days_ago': 7,
        'created_hours_ago': 2,
    },
    {
        'key': 'NEX-121',
        'title': 'Design empty states for sprint analytics',
        'description': (
            'New workspaces land on charts with no data and no explanation. Design a first-run '
            'state that points people toward creating their first sprint.\n\n'
            '- Empty, loading, and error variants for each chart\n'
            '- Illustration that works in dark and light themes\n'
            '- Copy that explains what appears once a sprint starts'
        ),
        'column': 'backlog',
        'priority': 'low',
        'label': 'UI/UX',
        'points': 3,
        'assignee': 'sofia',
        'created_by': 'sofia',
        'created_days_ago': 6,
        'created_hours_ago': 4,
    },
    {
        'key': 'NEX-112',
        'title': 'Fix stale board state after a failed optimistic mutation',
        'description': (
            'When a drag mutation fails, the card can stay in the destination column until a '
            'full refresh.\n\n'
            'Steps to reproduce:\n'
            '1. Throttle the network to offline in DevTools\n'
            '2. Drag a card from Todo to In Progress\n'
            '3. Restore the network and refresh\n\n'
            'The optimistic snapshot must roll back exactly, including column order, and surface '
            'a retry action.'
        ),
        'column': 'todo',
        'priority': 'urgent',
        'label': 'Bug',
        'points': 8,
        'assignee': 'alex',
        'created_by': 'lena',
        'created_days_ago': 2,
        'logs': [
            ('daniel', 'changed priority from High to Urgent', 1, 4),
        ],
        'comments': [
            (
                'lena',
                'Reproduced on a throttled connection: moving a card while offline leaves it in '
                'the new column until refresh. Returning the previous snapshot only fixes the '
                'moved task, not the reordered neighbours.',
                1,
                7,
            ),
        ],
    },
    {
        'key': 'NEX-115',
        'title': 'Add role-based permissions to issue mutations',
        'description': (
            'Only workspace members with the engineer or admin role should be able to create and '
            'move issues.\n\n'
            '- Add DRF permission classes for issue endpoints\n'
            '- Validate sprint membership before accepting a move\n'
            '- Return a consistent 403 payload the frontend can render\n'
            '- Cover viewer, engineer, and admin roles in tests'
        ),
        'column': 'todo',
        'priority': 'high',
        'label': 'Backend',
        'points': 5,
        'assignee': 'marcus',
        'created_by': 'daniel',
        'created_days_ago': 3,
        'created_hours_ago': 5,
    },
    {
        'key': 'NEX-119',
        'title': 'Polish keyboard navigation across the command palette',
        'description': (
            'The palette should be fully usable with the keyboard from the moment it opens.\n\n'
            '- Implement a combobox pattern with roving tabindex\n'
            '- Announce result counts to screen readers\n'
            '- Keep the active item visible while arrowing\n'
            '- Add a visible shortcut hint for opening the palette'
        ),
        'column': 'todo',
        'priority': 'medium',
        'label': 'UI/UX',
        'points': 3,
        'assignee': 'alex',
        'created_by': 'sofia',
        'created_days_ago': 5,
        'created_hours_ago': 6,
    },
    {
        'key': 'NEX-104',
        'title': 'Implement drag-and-drop reordering for the sprint board',
        'description': (
            'Wire up @dnd-kit across all five board columns so issues can be reordered within a '
            'column and moved between columns.\n\n'
            '- Persist ordering through the optimistic mutation layer\n'
            '- Keep keyboard sorting accessible with a drag handle\n'
            '- Render a drop-zone placeholder while dragging over a column\n'
            '- Cover cross-column moves in the board integration tests'
        ),
        'column': 'in_progress',
        'priority': 'urgent',
        'label': 'Frontend',
        'points': 8,
        'assignee': 'priya',
        'created_by': 'daniel',
        'created_days_ago': 5,
        'created_hours_ago': 3,
        'logs': [
            ('priya', 'moved this issue to In Progress', 2, 4),
        ],
        'comments': [
            (
                'marcus',
                'The API already accepts an ordered issue list — the reorder endpoint is live on '
                'staging. Send the full column order so the server can reconcile in one transaction.',
                1,
                6,
            ),
            (
                'priya',
                "Nice. I'm keeping the client-side order as the source of truth until the mutation "
                'resolves, then reconciling from the response.',
                0,
                20,
            ),
        ],
    },
    {
        'key': 'NEX-109',
        'title': 'Stream activity feed updates over WebSockets',
        'description': (
            'Push issue activity to connected board clients instead of polling every ten seconds.\n\n'
            '- Use Django Channels with a per-workspace group\n'
            '- Reconnect with jittered backoff after network loss\n'
            '- Deduplicate events using a monotonic sequence number\n'
            '- Drop the client to polling when the socket is unavailable'
        ),
        'column': 'in_progress',
        'priority': 'high',
        'label': 'Backend',
        'points': 5,
        'assignee': 'tomas',
        'created_by': 'tomas',
        'created_days_ago': 7,
        'logs': [
            ('tomas', 'moved this issue to In Progress', 3, 0),
        ],
        'comments': [
            (
                'marcus',
                'The token refresh path needs to preserve the socket. I hit a reconnect loop on '
                'staging when the access token rotated mid-session.',
                2,
                3,
            ),
        ],
    },
    {
        'key': 'NEX-107',
        'title': 'Build the sprint burndown chart endpoint',
        'description': (
            'Expose daily remaining points for the active sprint so the analytics view can render '
            'a burndown line.\n\n'
            '- Aggregate completed story points per day from the activity log\n'
            '- Return scope changes separately from completed work\n'
            '- Cache the response and refresh on a five-minute window'
        ),
        'column': 'in_review',
        'priority': 'medium',
        'label': 'API',
        'points': 5,
        'assignee': 'marcus',
        'created_by': 'daniel',
        'created_days_ago': 6,
        'logs': [
            ('marcus', 'moved this issue to In Review', 1, 2),
        ],
        'comments': [
            (
                'daniel',
                "Please include the ideal line data on the server — we don't want two "
                'implementations drifting apart between web and mobile.',
                1,
                5,
            ),
        ],
    },
    {
        'key': 'NEX-110',
        'title': 'Refine issue drawer transition timings',
        'description': (
            'The drawer currently feels heavy on slower machines. Tighten the motion and respect '
            'reduced-motion preferences.\n\n'
            '- Move the panel to a spring that settles under 260ms\n'
            '- Fade the backdrop in over 180ms\n'
            '- Disable transform animations with prefers-reduced-motion\n'
            '- Re-check focus trapping after the transition'
        ),
        'column': 'in_review',
        'priority': 'low',
        'label': 'UI/UX',
        'points': 2,
        'assignee': 'sofia',
        'created_by': 'sofia',
        'created_days_ago': 4,
        'created_hours_ago': 2,
        'logs': [
            ('sofia', 'moved this issue to In Review', 1, 8),
        ],
    },
    {
        'key': 'NEX-101',
        'title': 'Set up PostgreSQL connection pooling for the API',
        'description': (
            'The API is exhausting connections under board subscription load. Move PgBouncer in '
            'front of PostgreSQL and verify the Django connection lifecycle.\n\n'
            '- Use transaction pooling with a 120-connection ceiling\n'
            '- Set a sane CONN_MAX_AGE for workers\n'
            '- Load test 200 concurrent board subscribers\n'
            '- Document the pooling setup in the runbook'
        ),
        'column': 'done',
        'priority': 'high',
        'label': 'Backend',
        'points': 5,
        'assignee': 'tomas',
        'created_by': 'tomas',
        'created_days_ago': 10,
        'logs': [
            ('tomas', 'moved this issue to Done', 3, 3),
        ],
        'comments': [
            (
                'marcus',
                'Pool saturated at 40 concurrent board subscriptions on staging; 120 looks like '
                'the right ceiling. Nice work.',
                3,
                1,
            ),
        ],
    },
    {
        'key': 'NEX-098',
        'title': 'Redesign the workspace switcher and sidebar shell',
        'description': (
            'Rework the sidebar shell to support multiple workspaces without losing vertical space '
            'on smaller laptops.\n\n'
            '- Collapse to an icon rail below 1280px\n'
            '- Add a compact workspace switcher with keyboard access\n'
            '- Persist collapse preference per user\n'
            '- Match the new 1px border and surface tokens'
        ),
        'column': 'done',
        'priority': 'medium',
        'label': 'Frontend',
        'points': 3,
        'assignee': 'priya',
        'created_by': 'sofia',
        'created_days_ago': 9,
        'logs': [
            ('priya', 'moved this issue to Done', 4, 6),
        ],
    },
]

SPRINT_13_TASKS = [
    {
        'key': 'NEX-087',
        'title': 'Implement cursor pagination for issue lists',
        'description': (
            'Offset pagination duplicates rows while issues are being reordered. Move the issue '
            'list endpoint to opaque cursor pagination.'
        ),
        'column': 'done',
        'priority': 'high',
        'label': 'Backend',
        'points': 5,
        'assignee': 'marcus',
        'created_by': 'marcus',
        'created_days_ago': 26,
        'logs': [('marcus', 'moved this issue to Done', 17, 0)],
    },
    {
        'key': 'NEX-090',
        'title': 'Add keyboard shortcut cheatsheet overlay',
        'description': (
            'A searchable overlay for every board shortcut, opened with the question mark key.'
        ),
        'column': 'done',
        'priority': 'medium',
        'label': 'Frontend',
        'points': 3,
        'assignee': 'priya',
        'created_by': 'priya',
        'created_days_ago': 25,
        'logs': [('priya', 'moved this issue to Done', 15, 0)],
    },
    {
        'key': 'NEX-093',
        'title': 'Fix WebSocket reconnect storm under high latency',
        'description': (
            'Reconnect attempts synchronized across clients and hammered the gateway during an '
            'incident. Add jitter and a 30-second floor.'
        ),
        'column': 'done',
        'priority': 'urgent',
        'label': 'Bug',
        'points': 8,
        'assignee': 'tomas',
        'created_by': 'lena',
        'created_days_ago': 24,
        'logs': [('tomas', 'moved this issue to Done', 14, 0)],
    },
    {
        'key': 'NEX-095',
        'title': 'Polish onboarding empty states',
        'description': (
            'Align copy and illustration across the first-run workspace, team, and sprint empty '
            'states.'
        ),
        'column': 'done',
        'priority': 'low',
        'label': 'UI/UX',
        'points': 2,
        'assignee': 'sofia',
        'created_by': 'sofia',
        'created_days_ago': 23,
        'logs': [('sofia', 'moved this issue to Done', 13, 0)],
    },
]

BACKLOG_TASKS = [
    {
        'key': 'NEX-126',
        'title': 'Introduce saved views for board filters',
        'description': (
            'Let teams save a combination of filters and share it with the workspace.\n\n'
            '- Persist filter sets per workspace and per user\n'
            '- Support default views on workspace open\n'
            '- Show saved views in the sidebar with a shortcut key'
        ),
        'column': 'backlog',
        'priority': 'high',
        'label': 'Frontend',
        'points': 5,
        'assignee': 'priya',
        'created_by': 'daniel',
        'created_days_ago': 12,
    },
    {
        'key': 'NEX-127',
        'title': 'Add webhook delivery retries with exponential backoff',
        'description': (
            'Webhook deliveries currently fail permanently after one non-2xx response. Add retries '
            'with visibility into delivery history.'
        ),
        'column': 'backlog',
        'priority': 'medium',
        'label': 'API',
        'points': 3,
        'assignee': 'marcus',
        'created_by': 'marcus',
        'created_days_ago': 14,
    },
    {
        'key': 'NEX-128',
        'title': 'Explore density modes for the kanban board',
        'description': (
            'Prototype a compact card mode so teams can fit more work on screen without hiding '
            'priority or assignee.'
        ),
        'column': 'backlog',
        'priority': 'low',
        'label': 'UI/UX',
        'points': 2,
        'assignee': 'sofia',
        'created_by': 'sofia',
        'created_days_ago': 11,
    },
    {
        'key': 'NEX-129',
        'title': 'Design multi-tenant data isolation strategy',
        'description': (
            'Document and prototype row-level isolation for enterprise workspaces, including query '
            'scoping and audit requirements.'
        ),
        'column': 'backlog',
        'priority': 'urgent',
        'label': 'Backend',
        'points': 8,
        'assignee': 'tomas',
        'created_by': 'daniel',
        'created_days_ago': 16,
    },
]


def _add_comment(task, author, content, is_system_log, created_at):
    comment = ActivityComment.objects.create(
        task=task,
        author=author,
        content=content,
        is_system_log=is_system_log,
    )
    if created_at is not None:
        ActivityComment.objects.filter(pk=comment.pk).update(created_at=created_at)
    return comment


def _seed_tasks(sprint, specs, users, now):
    columns = {column.slug: column for column in Column.objects.filter(sprint=sprint)}
    positions = defaultdict(int)

    for spec in specs:
        column_slug = spec['column']
        column = columns.get(column_slug)
        if column is None:
            raise ValueError(f'Unknown column {column_slug} for {sprint.name}')

        task = Task.objects.create(
            column=column,
            issue_key=spec['key'],
            title=spec['title'],
            description=spec['description'],
            priority=spec['priority'],
            label=spec['label'],
            story_points=spec['points'],
            assignee=users[spec['assignee']],
            position=positions[column_slug],
        )
        positions[column_slug] += 1

        created_at = now - timedelta(
            days=spec.get('created_days_ago', 3),
            hours=spec.get('created_hours_ago', 0),
        )
        _add_comment(
            task,
            users[spec.get('created_by', 'daniel')],
            'created the issue',
            True,
            created_at,
        )

        latest = created_at
        for alias, content, days_ago, hours_ago in spec.get('logs', []):
            at = now - timedelta(days=days_ago, hours=hours_ago)
            _add_comment(task, users[alias], content, True, at)
            latest = max(latest, at)

        for alias, content, days_ago, hours_ago in spec.get('comments', []):
            at = now - timedelta(days=days_ago, hours=hours_ago)
            _add_comment(task, users[alias], content, False, at)
            latest = max(latest, at)

        Task.objects.filter(pk=task.pk).update(created_at=created_at, updated_at=latest)


def seed_demo_workspace(reset: bool = True) -> Workspace:
    """
    Create the recruiter sandbox workspace, or reset it when reset=True.

    The sandbox has three sprints, 20 issues total (12 in the active Sprint 14),
    five columns per sprint, seven teammates, realistic activity, and comments.
    """
    users = ensure_team()
    demo = users['alex']

    with transaction.atomic():
        existing_qs = Workspace.objects.filter(owner=demo, is_demo_sandbox=True)
        if reset:
            existing_qs.delete()
        else:
            existing = existing_qs.order_by('id').first()
            if existing:
                return existing

        workspace = Workspace.objects.create(
            name=DEMO_WORKSPACE_NAME,
            slug=unique_workspace_slug(DEMO_WORKSPACE_NAME),
            owner=demo,
            is_demo_sandbox=True,
        )

        today = timezone.localdate()
        active_sprint = Sprint.objects.create(
            workspace=workspace,
            name='Sprint 14',
            status=Sprint.Status.ACTIVE,
            start_date=today - timedelta(days=8),
            end_date=today + timedelta(days=5),
        )
        completed_sprint = Sprint.objects.create(
            workspace=workspace,
            name='Sprint 13',
            status=Sprint.Status.COMPLETED,
            start_date=today - timedelta(days=24),
            end_date=today - timedelta(days=10),
        )
        backlog_sprint = Sprint.objects.create(
            workspace=workspace,
            name='Backlog',
            status=Sprint.Status.PLANNED,
            start_date=None,
            end_date=None,
        )

        for sprint in (active_sprint, completed_sprint, backlog_sprint):
            create_columns(sprint)

        now = timezone.now()
        _seed_tasks(active_sprint, SPRINT_14_TASKS, users, now)
        _seed_tasks(completed_sprint, SPRINT_13_TASKS, users, now)
        _seed_tasks(backlog_sprint, BACKLOG_TASKS, users, now)

    return workspace
