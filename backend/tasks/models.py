from django.contrib.auth.models import User
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone


class Course(models.Model):
    """A subject/class the student is taking. Tasks and study sessions hang off it."""

    name = models.CharField(max_length=80)
    code = models.CharField(max_length=20, blank=True)
    color = models.CharField(max_length=7, default='#30a46c')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Task(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    ]

    CATEGORY_CHOICES = [
        ('assignment', 'Assignment'),
        ('exam', 'Exam'),
        ('project', 'Project'),
        ('reading', 'Reading'),
        ('other', 'Other'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    category = models.CharField(max_length=15, choices=CATEGORY_CHOICES, default='other')
    course = models.ForeignKey(
        Course, on_delete=models.SET_NULL, related_name='tasks', null=True, blank=True
    )
    due_date = models.DateTimeField(null=True, blank=True)
    estimated_minutes = models.PositiveIntegerField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tasks', null=True, blank=True)

    class Meta:
        # Priority is a string choice, so it is not sorted here; the client sorts.
        ordering = ['due_date', '-created_at']

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        # Keep completed_at in step with status so streaks and "done today" are reliable.
        if self.status == 'completed':
            if not self.completed_at:
                self.completed_at = timezone.now()
        else:
            self.completed_at = None
        super().save(*args, **kwargs)

    @property
    def is_overdue(self):
        if self.due_date and self.status != 'completed':
            return timezone.now() > self.due_date
        return False

    @property
    def days_until_due(self):
        if self.due_date:
            delta = self.due_date - timezone.now()
            return delta.days
        return None


class Subtask(models.Model):
    """A checklist step inside a task."""

    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='subtasks')
    title = models.CharField(max_length=200)
    done = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return self.title


class StudySession(models.Model):
    """A finished block of focused study time, logged by the focus timer."""

    task = models.ForeignKey(
        Task, on_delete=models.SET_NULL, related_name='sessions', null=True, blank=True
    )
    course = models.ForeignKey(
        Course, on_delete=models.SET_NULL, related_name='sessions', null=True, blank=True
    )
    minutes = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(600)]
    )
    started_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-started_at']

    def save(self, *args, **kwargs):
        # A session on a task belongs to that task's course unless told otherwise.
        if self.task_id and not self.course_id:
            self.course_id = self.task.course_id
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.minutes} min on {self.started_at:%Y-%m-%d}'
