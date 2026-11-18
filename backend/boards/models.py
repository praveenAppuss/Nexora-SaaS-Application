from django.conf import settings
from django.db import models
from django.utils.text import slugify


class Workspace(models.Model):
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=160, unique=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='owned_workspaces',
    )
    is_demo_sandbox = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name', 'id']
        indexes = [models.Index(fields=['owner'], name='workspace_owner_idx')]

    def __str__(self) -> str:
        return self.name


class Sprint(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        COMPLETED = 'completed', 'Completed'
        PLANNED = 'planned', 'Planned'

    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='sprints',
    )
    name = models.CharField(max_length=120)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PLANNED,
    )
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['-start_date', 'id']
        constraints = [
            models.UniqueConstraint(
                fields=['workspace', 'name'],
                name='unique_sprint_name_per_workspace',
            )
        ]
        indexes = [
            models.Index(
                fields=['workspace', 'status'],
                name='sprint_workspace_status_idx',
            )
        ]

    def __str__(self) -> str:
        return f'{self.workspace.name} · {self.name}'


class Column(models.Model):
    TITLE_CHOICES = [
        ('Backlog', 'Backlog'),
        ('Todo', 'Todo'),
        ('In Progress', 'In Progress'),
        ('In Review', 'In Review'),
        ('Done', 'Done'),
    ]
    SLUG_BY_TITLE = {
        'Backlog': 'backlog',
        'Todo': 'todo',
        'In Progress': 'in_progress',
        'In Review': 'in_review',
        'Done': 'done',
    }

    sprint = models.ForeignKey(
        Sprint,
        on_delete=models.CASCADE,
        related_name='columns',
    )
    title = models.CharField(max_length=32, choices=TITLE_CHOICES)
    slug = models.SlugField(max_length=32)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['position', 'id']
        constraints = [
            models.UniqueConstraint(
                fields=['sprint', 'slug'],
                name='unique_column_slug_per_sprint',
            )
        ]
        indexes = [
            models.Index(
                fields=['sprint', 'position'],
                name='column_sprint_position_idx',
            )
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self.SLUG_BY_TITLE.get(self.title, slugify(self.title))
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f'{self.sprint.name} · {self.title}'


class Task(models.Model):
    class Priority(models.TextChoices):
        URGENT = 'urgent', 'Urgent'
        HIGH = 'high', 'High'
        MEDIUM = 'medium', 'Medium'
        LOW = 'low', 'Low'
        NONE = 'none', 'No priority'

    class Label(models.TextChoices):
        FRONTEND = 'Frontend', 'Frontend'
        BACKEND = 'Backend', 'Backend'
        BUG = 'Bug', 'Bug'
        API = 'API', 'API'
        UI_UX = 'UI/UX', 'UI/UX'

    column = models.ForeignKey(
        Column,
        on_delete=models.CASCADE,
        related_name='tasks',
    )
    issue_key = models.CharField(max_length=20, blank=True, db_index=True)
    title = models.CharField(max_length=240)
    description = models.TextField(blank=True)
    priority = models.CharField(
        max_length=16,
        choices=Priority.choices,
        default=Priority.MEDIUM,
    )
    label = models.CharField(
        max_length=20,
        choices=Label.choices,
        blank=True,
        default='',
    )
    story_points = models.PositiveIntegerField(default=0)
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tasks',
    )
    position = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['position', 'id']
        indexes = [
            models.Index(
                fields=['column', 'position'],
                name='task_column_position_idx',
            ),
            models.Index(fields=['issue_key'], name='task_issue_key_idx'),
            models.Index(fields=['assignee'], name='task_assignee_idx'),
        ]

    @property
    def sprint(self) -> Sprint:
        return self.column.sprint

    @property
    def workspace(self) -> Workspace:
        return self.column.sprint.workspace

    def save(self, *args, **kwargs):
        if not self.issue_key:
            from .services import next_issue_key

            self.issue_key = next_issue_key(self.column.sprint.workspace)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f'{self.issue_key} · {self.title}'


class ActivityComment(models.Model):
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='comments',
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='activity_comments',
    )
    content = models.TextField()
    is_system_log = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at', 'id']
        indexes = [
            models.Index(
                fields=['task', 'created_at'],
                name='activity_task_created_idx',
            )
        ]

    def __str__(self) -> str:
        return f'{self.task.issue_key} · {self.content[:48]}'
