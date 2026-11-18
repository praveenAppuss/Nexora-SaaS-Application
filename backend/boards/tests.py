from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework import status
from rest_framework.test import APITestCase

from .models import ActivityComment, Column, Task
from .seed import DEMO_EMAIL, DEMO_PASSWORD


class NexoraApiTests(APITestCase):
    def setUp(self):
        response = self.client.post('/api/auth/demo-login/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.access_token = response.data['access']
        self.assertEqual(response.data['is_demo'], True)
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {self.access_token}'
        )

    def board(self, sprint_id=None):
        url = '/api/workspaces/current/board/'
        if sprint_id is not None:
            url = f'{url}?sprint={sprint_id}'
        return self.client.get(url)

    def test_demo_login_returns_working_jwt(self):
        response = self.board()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['workspace']['name'], 'Nexora Core Engineering')

    def test_standard_login_with_email(self):
        self.client.credentials()
        response = self.client.post(
            '/api/auth/login/',
            {'email': DEMO_EMAIL, 'password': DEMO_PASSWORD},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_wrong_password_is_rejected(self):
        self.client.credentials()
        response = self.client.post(
            '/api/auth/login/',
            {'email': DEMO_EMAIL, 'password': 'not-the-password'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_board_requires_authentication(self):
        self.client.credentials()
        response = self.board()
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_board_shape_and_ordering(self):
        response = self.board()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data

        self.assertEqual(len(data['columns']), 5)
        self.assertEqual(len(data['tasks']), 12)
        self.assertEqual(len(data['members']), 7)
        self.assertEqual(len(data['labels']), 5)
        self.assertEqual(data['sprint']['name'], 'Sprint 14')
        self.assertEqual(len(data['sprints']), 3)

        self.assertEqual(
            [column['slug'] for column in data['columns']],
            ['backlog', 'todo', 'in_progress', 'in_review', 'done'],
        )
        for column in data['columns']:
            positions = [task['position'] for task in column['tasks']]
            self.assertEqual(positions, sorted(positions))

        self.assertEqual(data['stats']['total_story_points'], 60)
        self.assertEqual(data['stats']['completed_story_points'], 8)
        self.assertEqual(data['stats']['completion_percentage'], 13)

    def test_board_query_count_is_bounded(self):
        with CaptureQueriesContext(connection) as queries:
            response = self.board()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLess(
            len(queries),
            25,
            f'Board endpoint used {len(queries)} queries; check N+1 patterns.',
        )

    def test_sprint_filter(self):
        board = self.board().data
        completed = next(
            sprint for sprint in board['sprints'] if sprint['name'] == 'Sprint 13'
        )
        response = self.board(completed['id'])
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['sprint']['name'], 'Sprint 13')
        self.assertEqual(
            response.data['stats']['completion_percentage'],
            100,
        )

    def test_move_task_reorders_atomically_and_logs(self):
        board = self.board().data
        done_column = next(
            column for column in board['columns'] if column['slug'] == 'done'
        )
        task = next(
            task for task in board['tasks'] if task['issue_key'] == 'NEX-112'
        )
        source_column_id = task['column']

        response = self.client.post(
            f"/api/tasks/{task['id']}/move/",
            {'target_column_id': done_column['id'], 'new_position': 0},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        moved = response.data['task']
        self.assertEqual(moved['column_slug'], 'done')
        self.assertEqual(moved['position'], 0)

        done_tasks = (
            Task.objects.filter(column_id=done_column['id'])
            .order_by('position')
            .values_list('position', flat=True)
        )
        self.assertEqual(list(done_tasks), list(range(len(done_tasks))))

        source_tasks = (
            Task.objects.filter(column_id=source_column_id)
            .order_by('position')
            .values_list('position', flat=True)
        )
        self.assertEqual(
            list(source_tasks),
            list(range(len(source_tasks))),
        )

        self.assertTrue(
            ActivityComment.objects.filter(
                task_id=task['id'],
                is_system_log=True,
                content__contains='moved this issue from Todo to Done',
            ).exists()
        )

    def test_patch_priority_logs_system_activity(self):
        board = self.board().data
        task = next(
            task for task in board['tasks'] if task['issue_key'] == 'NEX-104'
        )
        response = self.client.patch(
            f"/api/tasks/{task['id']}/",
            {'priority': 'high', 'story_points': 13},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['priority'], 'high')
        self.assertEqual(response.data['story_points'], 13)
        self.assertTrue(
            ActivityComment.objects.filter(
                task_id=task['id'],
                is_system_log=True,
                content__contains='changed priority from Urgent to High',
            ).exists()
        )

    def test_create_task_assigns_issue_key_and_appends(self):
        board = self.board().data
        backlog = next(
            column for column in board['columns'] if column['slug'] == 'backlog'
        )
        response = self.client.post(
            '/api/tasks/',
            {
                'column': backlog['id'],
                'title': 'Write API integration tests',
                'description': 'Cover the board and move endpoints.',
                'priority': 'medium',
                'label': 'Backend',
                'story_points': 3,
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertRegex(response.data['issue_key'], r'^NEX-\d+$')
        self.assertEqual(response.data['column_slug'], 'backlog')
        self.assertEqual(response.data['position'], len(backlog['tasks']))

    def test_comment_endpoint(self):
        board = self.board().data
        task = board['tasks'][0]
        response = self.client.post(
            f"/api/tasks/{task['id']}/comments/",
            {'content': 'Reviewed on staging — ready for QA.'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(response.data['is_system_log'])
        self.assertEqual(
            response.data['content'],
            'Reviewed on staging — ready for QA.',
        )
