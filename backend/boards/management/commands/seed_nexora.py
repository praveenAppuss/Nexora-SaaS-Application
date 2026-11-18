from django.core.management.base import BaseCommand

from boards.models import ActivityComment, Column, Sprint, Task
from boards.seed import (
    DEMO_EMAIL,
    DEMO_PASSWORD,
    DEMO_USERNAME,
    seed_demo_workspace,
)


class Command(BaseCommand):
    help = (
        'Seed (or reset) the Nexora recruiter sandbox workspace with '
        'realistic users, sprints, columns, issues, and activity.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--no-reset',
            action='store_true',
            help='Keep an existing demo workspace instead of rebuilding it.',
        )

    def handle(self, *args, **options):
        workspace = seed_demo_workspace(reset=not options['no_reset'])

        task_count = Task.objects.filter(
            column__sprint__workspace=workspace
        ).count()
        sprint_count = Sprint.objects.filter(workspace=workspace).count()
        column_count = Column.objects.filter(
            sprint__workspace=workspace
        ).count()
        comment_count = ActivityComment.objects.filter(
            task__column__sprint__workspace=workspace
        ).count()

        self.stdout.write(
            self.style.SUCCESS(
                f'Seeded workspace "{workspace.name}" '
                f'({workspace.id}) with {sprint_count} sprints, '
                f'{column_count} columns, {task_count} issues, and '
                f'{comment_count} activity/comment records.'
            )
        )
        self.stdout.write(
            f'Demo login: {DEMO_EMAIL} / {DEMO_PASSWORD} '
            f'(username: {DEMO_USERNAME})'
        )
