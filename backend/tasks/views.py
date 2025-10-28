from rest_framework import generics
from rest_framework.response import Response
from .models import Task
from .serializers import TaskSerializer

class TaskListCreateView(generics.ListCreateAPIView):
    serializer_class = TaskSerializer
    
    def get_queryset(self):
        return Task.objects.all()  # For now, return all tasks
    
    def perform_create(self, serializer):
        serializer.save()  # For now, don't assign user

class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer