import django.core.validators
import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


def backfill_completed_at(apps, schema_editor):
    """Tasks completed before this field existed get their last update time."""
    Task = apps.get_model('tasks', 'Task')
    Task.objects.filter(status='completed', completed_at__isnull=True).update(
        completed_at=models.F('updated_at')
    )


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0003_alter_task_options_task_category_alter_task_status'),
    ]

    operations = [
        migrations.CreateModel(
            name='Course',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=80)),
                ('code', models.CharField(blank=True, max_length=20)),
                ('color', models.CharField(default='#30a46c', max_length=7)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['name'],
            },
        ),
        migrations.AlterModelOptions(
            name='task',
            options={'ordering': ['due_date', '-created_at']},
        ),
        migrations.AddField(
            model_name='task',
            name='completed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='task',
            name='estimated_minutes',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='task',
            name='course',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='tasks', to='tasks.course'),
        ),
        migrations.CreateModel(
            name='Subtask',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('done', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('task', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='subtasks', to='tasks.task')),
            ],
            options={
                'ordering': ['id'],
            },
        ),
        migrations.CreateModel(
            name='StudySession',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('minutes', models.PositiveIntegerField(validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(600)])),
                ('started_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('course', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sessions', to='tasks.course')),
                ('task', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sessions', to='tasks.task')),
            ],
            options={
                'ordering': ['-started_at'],
            },
        ),
        migrations.RunPython(backfill_completed_at, migrations.RunPython.noop),
    ]
