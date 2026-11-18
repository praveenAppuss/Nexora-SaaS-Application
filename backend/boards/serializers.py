from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed

from .models import ActivityComment, Column, Sprint, Task, Workspace
from .services import next_issue_key

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'name')
        read_only_fields = fields

    def get_name(self, obj) -> str:
        return obj.get_full_name().strip() or obj.username


class WorkspaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = ('id', 'name', 'slug', 'owner', 'is_demo_sandbox', 'created_at')
        read_only_fields = fields


class SprintSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sprint
        fields = ('id', 'workspace', 'name', 'status', 'start_date', 'end_date')
        read_only_fields = fields


class ActivityCommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)

    class Meta:
        model = ActivityComment
        fields = ('id', 'task', 'author', 'content', 'is_system_log', 'created_at')
        read_only_fields = ('id', 'task', 'author', 'created_at')


class TaskSerializer(serializers.ModelSerializer):
    assignee = UserSerializer(read_only=True)
    assignee_id = serializers.PrimaryKeyRelatedField(
        source='assignee',
        queryset=User.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    column_slug = serializers.CharField(source='column.slug', read_only=True)
    sprint_id = serializers.IntegerField(source='column.sprint_id', read_only=True)
    workspace_id = serializers.IntegerField(
        source='column.sprint.workspace_id',
        read_only=True,
    )
    comments = ActivityCommentSerializer(many=True, read_only=True)

    class Meta:
        model = Task
        fields = (
            'id',
            'issue_key',
            'title',
            'description',
            'column',
            'column_slug',
            'sprint_id',
            'workspace_id',
            'priority',
            'label',
            'story_points',
            'assignee',
            'assignee_id',
            'position',
            'created_at',
            'updated_at',
            'comments',
        )
        read_only_fields = (
            'id',
            'issue_key',
            'position',
            'created_at',
            'updated_at',
        )
        extra_kwargs = {
            'title': {'max_length': 240},
            'label': {'allow_blank': True, 'required': False},
        }

    def validate_column(self, column: Column) -> Column:
        request = self.context.get('request')
        if request and column.sprint.workspace.owner_id != request.user.id:
            raise serializers.ValidationError(
                'That column does not belong to your workspace.'
            )
        return column

    def create(self, validated_data):
        column: Column = validated_data['column']
        workspace = column.sprint.workspace

        with transaction.atomic():
            Workspace.objects.select_for_update().get(pk=workspace.pk)
            validated_data['issue_key'] = next_issue_key(workspace)
            validated_data['position'] = Task.objects.filter(column=column).count()
            return super().create(validated_data)


class ColumnSerializer(serializers.ModelSerializer):
    task_count = serializers.SerializerMethodField()
    story_points = serializers.SerializerMethodField()

    class Meta:
        model = Column
        fields = ('id', 'title', 'slug', 'position', 'task_count', 'story_points')
        read_only_fields = fields

    def get_task_count(self, obj) -> int:
        return len(obj.tasks.all())

    def get_story_points(self, obj) -> int:
        return sum(task.story_points for task in obj.tasks.all())


class BoardColumnSerializer(ColumnSerializer):
    tasks = TaskSerializer(many=True, read_only=True)

    class Meta(ColumnSerializer.Meta):
        fields = ColumnSerializer.Meta.fields + ('tasks',)


class MoveTaskSerializer(serializers.Serializer):
    target_column_id = serializers.IntegerField(min_value=1)
    new_position = serializers.IntegerField(min_value=0)


class CommentCreateSerializer(serializers.Serializer):
    content = serializers.CharField(trim_whitespace=True, max_length=4000)

    def validate_content(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError('A comment cannot be empty.')
        return value.strip()


class LoginSerializer(serializers.Serializer):
    email = serializers.CharField(required=False, allow_blank=True)
    username = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        identifier = (attrs.get('email') or attrs.get('username') or '').strip()
        password = attrs.get('password') or ''

        if not identifier or not password:
            raise serializers.ValidationError('Email and password are required.')

        user = (
            User.objects.filter(
                Q(username__iexact=identifier) | Q(email__iexact=identifier)
            )
            .order_by('id')
            .first()
        )

        if user is None or not user.is_active or not user.check_password(password):
            raise AuthenticationFailed(
                'No active account found with the provided credentials.'
            )

        attrs['user'] = user
        return attrs
