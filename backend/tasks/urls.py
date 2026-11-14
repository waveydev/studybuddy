from django.urls import path

from . import views

urlpatterns = [
    path('api/tasks/', views.TaskListCreateView.as_view(), name='task-list-create'),
    path('api/tasks/<int:pk>/', views.TaskDetailView.as_view(), name='task-detail'),
    path('api/tasks/<int:task_pk>/subtasks/', views.SubtaskCreateView.as_view(), name='subtask-create'),
    path('api/subtasks/<int:pk>/', views.SubtaskDetailView.as_view(), name='subtask-detail'),
    path('api/courses/', views.CourseListCreateView.as_view(), name='course-list-create'),
    path('api/courses/<int:pk>/', views.CourseDetailView.as_view(), name='course-detail'),
    path('api/sessions/', views.StudySessionListCreateView.as_view(), name='session-list-create'),
]
