from django.contrib import admin

from .models import ActivityComment, Column, Sprint, Task, Workspace


@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'owner', 'is_demo_sandbox', 'created_at')
    list_filter = ('is_demo_sandbox',)
    search_fields = ('name', 'slug', 'owner__username', 'owner__email')


@admin.register(Sprint)
class SprintAdmin(admin.ModelAdmin):
    list_display = ('name', 'workspace', 'status', 'start_date', 'end_date')
    list_filter = ('status', 'workspace')
    search_fields = ('name', 'workspace__name')


@admin.register(Column)
class ColumnAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'sprint', 'position')
    list_filter = ('title', 'sprint__workspace')
    ordering = ('sprint', 'position')


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = (
        'issue_key',
        'title',
        'column',
        'priority',
        'assignee',
        'position',
    )
    list_filter = ('priority', 'label', 'column__sprint', 'column')
    search_fields = ('issue_key', 'title', 'description')
    raw_id_fields = ('assignee',)


@admin.register(ActivityComment)
class ActivityCommentAdmin(admin.ModelAdmin):
    list_display = ('task', 'author', 'is_system_log', 'created_at')
    list_filter = ('is_system_log',)
    search_fields = ('content', 'task__issue_key')
