import re

from django.db.models import Sum
from rest_framework import serializers

from .models import Course, StudySession, Subtask, Task


class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ['id', 'name', 'code', 'color', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_color(self, value):
        if not re.fullmatch(r'#[0-9a-fA-F]{6}', value):
            raise serializers.ValidationError('Color must be a hex value like #30a46c.')
        return value.lower()


class SubtaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subtask
        fields = ['id', 'task', 'title', 'done']
        read_only_fields = ['id', 'task']


class TaskSerializer(serializers.ModelSerializer):
    is_overdue = serializers.ReadOnlyField()
    days_until_due = serializers.ReadOnlyField()
    subtasks = SubtaskSerializer(many=True, read_only=True)
    focus_minutes = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'priority', 'status', 'category',
            'course', 'due_date', 'estimated_minutes', 'completed_at',
            'created_at', 'updated_at', 'is_overdue', 'days_until_due',
            'subtasks', 'focus_minutes',
        ]
        read_only_fields = [
            'id', 'completed_at', 'created_at', 'updated_at',
            'is_overdue', 'days_until_due',
        ]

    def get_focus_minutes(self, obj):
        # List/detail querysets annotate this; freshly saved instances do not.
        annotated = getattr(obj, 'focus_minutes_total', None)
        if annotated is not None:
            return annotated
        return obj.sessions.aggregate(total=Sum('minutes'))['total'] or 0


class StudySessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudySession
        fields = ['id', 'task', 'course', 'minutes', 'started_at']
        read_only_fields = ['id']
