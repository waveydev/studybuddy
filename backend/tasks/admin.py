from django.contrib import admin

from .models import Course, StudySession, Subtask, Task


class SubtaskInline(admin.TabularInline):
    model = Subtask
    extra = 0


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'category', 'priority', 'status', 'due_date')
    list_filter = ('status', 'priority', 'category', 'course')
    search_fields = ('title', 'description')
    inlines = [SubtaskInline]


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'color')


@admin.register(StudySession)
class StudySessionAdmin(admin.ModelAdmin):
    list_display = ('started_at', 'minutes', 'task', 'course')
