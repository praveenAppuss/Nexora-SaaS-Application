from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db.models import Prefetch, Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import ActivityComment, Column, Sprint, Task, Workspace
from .seed import seed_demo_workspace
from .serializers import (
    ActivityCommentSerializer,
    BoardColumnSerializer,
    CommentCreateSerializer,
    LoginSerializer,
    MoveTaskSerializer,
    SprintSerializer,
    TaskSerializer,
    UserSerializer,
    WorkspaceSerializer,
)
from .services import ensure_starter_workspace, log_system, move_task

User = get_user_model()

LABEL_COLORS = {
    'Frontend': 'blue',
    'Backend': 'emerald',
    'Bug': 'red',
    'API': 'violet',
    'UI/UX': 'amber',
}

SPRINT_SORT_ORDER = {'active': 0, 'completed': 1, 'planned': 2}


def build_auth_payload(user, workspace, is_demo: bool) -> dict:
    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'token_type': 'Bearer',
        'user': UserSerializer(user).data,
        'workspace_id': workspace.id,
        'is_demo': is_demo,
    }


class LoginView(APIView):
    """JWT login accepting either an email address or a username."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get_authenticate_header(self, request):
        # Keep failed logins as 401 instead of DRF's headerless 403 fallback.
        return 'Bearer realm="api"'

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        workspace = ensure_starter_workspace(user)
        return Response(
            build_auth_payload(user, workspace, workspace.is_demo_sandbox)
        )


class DemoLoginView(APIView):
    """Recruiter sandbox: reset the demo workspace and return JWTs immediately."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        workspace = seed_demo_workspace(reset=True)
        return Response(
            build_auth_payload(workspace.owner, workspace, True)
        )


class WorkspaceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = WorkspaceSerializer

    def get_queryset(self):
        return Workspace.objects.filter(owner=self.request.user).select_related(
            'owner'
        )

    @action(detail=False, methods=['get'], url_path='current/board')
    def current_board(self, request):
        workspace = self.get_queryset().order_by('id').first()
        if workspace is None:
            raise NotFound('No workspace is available for this account.')

        sprints = list(Sprint.objects.filter(workspace=workspace))
        sprints.sort(
            key=lambda sprint: (
                SPRINT_SORT_ORDER.get(sprint.status, 3),
                -(sprint.start_date.toordinal() if sprint.start_date else 0),
                sprint.id,
            )
        )

        sprint_id = request.query_params.get('sprint')
        if sprint_id:
            try:
                sprint_id_int = int(sprint_id)
            except (TypeError, ValueError):
                raise ValidationError({'sprint': 'Sprint id must be an integer.'})
            sprint = next(
                (item for item in sprints if item.id == sprint_id_int),
                None,
            )
            if sprint is None:
                raise NotFound('That sprint could not be found.')
        else:
            sprint = next(
                (item for item in sprints if item.status == Sprint.Status.ACTIVE),
                sprints[0] if sprints else None,
            )
            if sprint is None:
                raise NotFound('This workspace has no sprints yet.')

        task_queryset = (
            Task.objects.select_related(
                'assignee',
                'column',
                'column__sprint',
                'column__sprint__workspace',
            )
            .prefetch_related(
                Prefetch(
                    'comments',
                    queryset=ActivityComment.objects.select_related(
                        'author'
                    ).order_by('created_at', 'id'),
                )
            )
            .order_by('position', 'id')
        )
        columns = list(
            Column.objects.filter(sprint=sprint)
            .prefetch_related(
                Prefetch('tasks', queryset=task_queryset),
            )
            .order_by('position', 'id')
        )

        columns_payload = BoardColumnSerializer(
            columns,
            many=True,
            context=self.get_serializer_context(),
        ).data
        tasks_payload = [
            task for column in columns_payload for task in column['tasks']
        ]

        member_ids = set(
            User.objects.filter(
                Q(id=workspace.owner_id)
                | Q(assigned_tasks__column__sprint__workspace=workspace)
                | Q(
                    activity_comments__task__column__sprint__workspace=workspace
                )
            )
            .values_list('id', flat=True)
            .distinct()
        )
        members = User.objects.filter(id__in=member_ids).order_by(
            'first_name', 'last_name', 'username'
        )

        total_tasks = len(tasks_payload)
        completed_tasks = sum(
            1 for task in tasks_payload if task['column_slug'] == 'done'
        )
        total_points = sum(task['story_points'] for task in tasks_payload)
        completed_points = sum(
            task['story_points']
            for task in tasks_payload
            if task['column_slug'] == 'done'
        )
        completion_percentage = (
            round(completed_points / total_points * 100) if total_points else 0
        )

        labels_payload = [
            {'id': value, 'name': label, 'color': LABEL_COLORS[value]}
            for value, label in Task.Label.choices
        ]

        return Response(
            {
                'workspace': WorkspaceSerializer(workspace).data,
                'sprint': SprintSerializer(sprint).data,
                'sprints': SprintSerializer(sprints, many=True).data,
                'columns': columns_payload,
                'tasks': tasks_payload,
                'members': UserSerializer(members, many=True).data,
                'labels': labels_payload,
                'stats': {
                    'total_tasks': total_tasks,
                    'completed_tasks': completed_tasks,
                    'total_story_points': total_points,
                    'completed_story_points': completed_points,
                    'completion_percentage': completion_percentage,
                },
            }
        )


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    filterset_fields = {
        'priority': ['exact', 'in'],
        'label': ['exact'],
        'assignee': ['exact'],
        'column': ['exact'],
        'column__sprint': ['exact'],
        'story_points': ['exact', 'gte', 'lte'],
    }
    search_fields = ('issue_key', 'title', 'description')
    ordering_fields = (
        'position',
        'created_at',
        'updated_at',
        'story_points',
        'priority',
    )
    ordering = ('column__position', 'position', 'id')

    def get_queryset(self):
        return (
            Task.objects.filter(
                column__sprint__workspace__owner=self.request.user
            )
            .select_related(
                'assignee',
                'column',
                'column__sprint',
                'column__sprint__workspace',
            )
            .prefetch_related(
                Prefetch(
                    'comments',
                    queryset=ActivityComment.objects.select_related(
                        'author'
                    ).order_by('created_at', 'id'),
                )
            )
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        task = self.get_queryset().get(pk=serializer.instance.pk)
        return Response(
            self.get_serializer(task).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=partial,
        )
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        task = self.get_queryset().get(pk=instance.pk)
        return Response(self.get_serializer(task).data)

    def perform_create(self, serializer):
        task = serializer.save()
        log_system(task, self.request.user, 'created the issue')

    def perform_update(self, serializer):
        instance = serializer.instance
        previous_priority = instance.priority
        previous_column = instance.column
        target_column = serializer.validated_data.get('column')

        if (
            target_column is not None
            and target_column.pk != previous_column.pk
        ):
            serializer.validated_data.pop('column', None)

        task = serializer.save()

        if (
            target_column is not None
            and target_column.pk != previous_column.pk
        ):
            next_position = (
                Task.objects.filter(column=target_column)
                .exclude(pk=task.pk)
                .count()
            )
            task = move_task(
                task,
                target_column,
                next_position,
                self.request.user,
            )

        if task.priority != previous_priority:
            labels = dict(Task.Priority.choices)
            log_system(
                task,
                self.request.user,
                f'changed priority from {labels[previous_priority]} '
                f'to {labels[task.priority]}',
            )

    @action(detail=True, methods=['post'], url_path='move')
    def move(self, request, pk=None):
        task = self.get_object()
        serializer = MoveTaskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target_column_id = serializer.validated_data['target_column_id']
        new_position = serializer.validated_data['new_position']

        target_column = (
            Column.objects.select_related('sprint')
            .filter(
                pk=target_column_id,
                sprint_id=task.column.sprint_id,
            )
            .first()
        )
        if target_column is None:
            raise ValidationError(
                {
                    'target_column_id': (
                        'The target column must exist in the task sprint.'
                    )
                }
            )

        sprint_id = task.column.sprint_id
        moved = move_task(task, target_column, new_position, request.user)
        moved = self.get_queryset().get(pk=moved.pk)
        sprint_tasks = self.get_queryset().filter(
            column__sprint_id=sprint_id
        ).order_by('column__position', 'position', 'id')

        return Response(
            {
                'task': self.get_serializer(moved).data,
                'tasks': self.get_serializer(sprint_tasks, many=True).data,
            }
        )

    @action(detail=True, methods=['get', 'post'], url_path='comments')
    def comments(self, request, pk=None):
        task = self.get_object()

        if request.method.lower() == 'post':
            serializer = CommentCreateSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            comment = ActivityComment.objects.create(
                task=task,
                author=request.user,
                content=serializer.validated_data['content'],
                is_system_log=False,
            )
            task.save(update_fields=['updated_at'])
            return Response(
                ActivityCommentSerializer(comment).data,
                status=status.HTTP_201_CREATED,
            )

        comments = task.comments.select_related('author').order_by(
            'created_at', 'id'
        )
        return Response(
            ActivityCommentSerializer(comments, many=True).data
        )
