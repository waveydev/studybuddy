from django.urls import path
from . import views

urlpatterns = [
    path('api/tasks/', views.TaskListCreateView.as_view(), name='task-list-create'),
    path('api/tasks/<int:pk>/', views.TaskDetailView.as_view(), name='task-detail'),
    ]