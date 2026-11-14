from datetime import timedelta

from django.db.models import Sum
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics

from .models import Course, StudySession, Subtask, Task
from .serializers import (
    CourseSerializer,
    StudySessionSerializer,
    SubtaskSerializer,
    TaskSerializer,
)

# How far back the session log goes; enough for streaks and weekly charts.
SESSION_HISTORY_DAYS = 120


def task_queryset():
    return (
        Task.objects.all()
        .prefetch_related('subtasks')
        .annotate(focus_minutes_total=Coalesce(Sum('sessions__minutes'), 0))
    )


class TaskListCreateView(generics.ListCreateAPIView):
    serializer_class = TaskSerializer

    def get_queryset(self):
        return task_queryset()  # No auth yet: every task is visible


class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TaskSerializer

    def get_queryset(self):
        return task_queryset()


class SubtaskCreateView(generics.CreateAPIView):
    serializer_class = SubtaskSerializer

    def perform_create(self, serializer):
        task = get_object_or_404(Task, pk=self.kwargs['task_pk'])
        serializer.save(task=task)


class SubtaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Subtask.objects.all()
    serializer_class = SubtaskSerializer


class CourseListCreateView(generics.ListCreateAPIView):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer


class CourseDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer


class StudySessionListCreateView(generics.ListCreateAPIView):
    serializer_class = StudySessionSerializer

    def get_queryset(self):
        since = timezone.now() - timedelta(days=SESSION_HISTORY_DAYS)
        return StudySession.objects.filter(started_at__gte=since)
