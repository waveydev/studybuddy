from rest_framework import serializers
from .models import Task

class TaskSerializer(serializers.ModelSerializer):
    is_overdue = serializers.ReadOnlyField()
    days_until_due = serializers.ReadOnlyField()
    
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'priority', 'status', 'category',
            'due_date', 'created_at', 'updated_at', 'is_overdue', 'days_until_due'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_overdue', 'days_until_due']