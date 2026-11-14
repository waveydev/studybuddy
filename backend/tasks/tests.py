from rest_framework import status
from rest_framework.test import APITestCase

from .models import Course, StudySession, Task


class TaskApiTests(APITestCase):
    def test_create_task_with_course_and_estimate(self):
        course = Course.objects.create(name='Biology', color='#30a46c')
        res = self.client.post(
            '/api/tasks/',
            {'title': 'Lab report', 'course': course.id, 'estimated_minutes': 90},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['course'], course.id)
        self.assertEqual(res.data['estimated_minutes'], 90)
        self.assertEqual(res.data['subtasks'], [])
        self.assertEqual(res.data['focus_minutes'], 0)

    def test_completed_at_follows_status(self):
        task = Task.objects.create(title='Read chapter 3')
        res = self.client.patch(f'/api/tasks/{task.id}/', {'status': 'completed'}, format='json')
        self.assertIsNotNone(res.data['completed_at'])
        res = self.client.patch(f'/api/tasks/{task.id}/', {'status': 'pending'}, format='json')
        self.assertIsNone(res.data['completed_at'])

    def test_deleting_course_keeps_its_tasks(self):
        course = Course.objects.create(name='History')
        task = Task.objects.create(title='Essay', course=course)
        self.client.delete(f'/api/courses/{course.id}/')
        task.refresh_from_db()
        self.assertIsNone(task.course)


class SubtaskApiTests(APITestCase):
    def test_subtask_lifecycle(self):
        task = Task.objects.create(title='Project')
        res = self.client.post(f'/api/tasks/{task.id}/subtasks/', {'title': 'Outline'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        sub_id = res.data['id']

        self.client.patch(f'/api/subtasks/{sub_id}/', {'done': True}, format='json')
        res = self.client.get(f'/api/tasks/{task.id}/')
        self.assertEqual(res.data['subtasks'], [
            {'id': sub_id, 'task': task.id, 'title': 'Outline', 'done': True},
        ])

        res = self.client.delete(f'/api/subtasks/{sub_id}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

    def test_subtask_on_missing_task_is_404(self):
        res = self.client.post('/api/tasks/999/subtasks/', {'title': 'x'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


class StudySessionApiTests(APITestCase):
    def test_session_inherits_course_and_counts_toward_task(self):
        course = Course.objects.create(name='Maths')
        task = Task.objects.create(title='Problem set', course=course)
        for minutes in (25, 25):
            res = self.client.post('/api/sessions/', {'task': task.id, 'minutes': minutes}, format='json')
            self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(StudySession.objects.first().course, course)

        res = self.client.get('/api/tasks/')
        self.assertEqual(res.data[0]['focus_minutes'], 50)

    def test_session_rejects_zero_minutes(self):
        res = self.client.post('/api/sessions/', {'minutes': 0}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class CourseApiTests(APITestCase):
    def test_color_must_be_hex(self):
        res = self.client.post('/api/courses/', {'name': 'Art', 'color': 'green'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
