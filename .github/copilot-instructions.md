## StudyBuddy — AI assistant instructions

Short orientation
- Backend: Django REST API at `backend/` (project: `studybuddy_backend`). The tasks app lives in `backend/tasks/` and exposes the API.
- Frontend: React app at `frontend/studybuddy-frontend/` (Create React App + axios). The main UI component is `src/components/TaskList.js` and `src/App.js` mounts it.
- DB: SQLite at `backend/db.sqlite3`. No requirements.txt; dependencies are inferred from `settings.py` and `package.json`.

Dev / run commands (what works out of the box)
- Backend (from repo root):
  - Create venv and install essentials: `python -m venv .venv && .venv/bin/pip install django djangorestframework django-cors-headers`
  - Run migrations: `./backend/manage.py migrate`
  - Start server: `./backend/manage.py runserver` (defaults to http://127.0.0.1:8000)
- Frontend (from repo root):
  - `cd frontend/studybuddy-frontend && npm install`
  - `npm start` (CRA dev server, default http://localhost:3000)

API surface (concrete examples)
- Endpoints (see `backend/tasks/urls.py`):
  - GET  /api/tasks/        — returns array of tasks
  - POST /api/tasks/        — create task (fields: `title`, `description`, `priority`, `category`, `due_date` (ISO or null))
  - GET/PATCH/DELETE /api/tasks/<id>/  — retrieve, partial update or delete
- Serializer fields (see `backend/tasks/serializers.py`):
  - id, title, description, priority, status, category, due_date, created_at, updated_at, is_overdue (read-only), days_until_due (read-only)
- Example POST payload used by the frontend:
  { "title":"Study chapter 3", "description":"...", "priority":"medium", "category":"assignment", "due_date":"2025-10-30T14:00:00Z" }

Cross-cutting patterns and gotchas (project-specific)
- CORS: `backend/studybuddy_backend/settings.py` contains `CORS_ALLOWED_ORIGINS = ["http://localhost:3000"]`. The frontend currently calls `http://127.0.0.1:8000` from `TaskList.js` — if you use `127.0.0.1:3000` or a different host, add it to `CORS_ALLOWED_ORIGINS`.
- No authentication: `REST_FRAMEWORK.DEFAULT_PERMISSION_CLASSES` is `AllowAny`. The `Task.user` FK exists but is optional; current views don't attach users in `perform_create`.
- DRF usage: class-based generic views are used (`ListCreateAPIView`, `RetrieveUpdateDestroyAPIView`) in `backend/tasks/views.py`. Keep changes simple by following the same pattern.
- Read-only computed fields: `is_overdue` and `days_until_due` are provided by the serializer as `ReadOnlyField()` and by model properties in `backend/tasks/models.py`.
- Model ordering: `Task.Meta.ordering = ['due_date', '-priority', '-created_at']` — note `priority` is a string choice, so numeric conversions may be required if you change sorting logic.
- Frontend datetime handling: `TaskList.js` converts HTML `datetime-local` to ISO (`new Date(...).toISOString()`) and posts `null` when empty — follow that pattern for compatibility.

Where to look when changing behaviour
- Add/change endpoints or validation: `backend/tasks/serializers.py` and `backend/tasks/views.py`.
- Model/persistence changes: `backend/tasks/models.py` and migrations under `backend/tasks/migrations/`.
- Frontend UI/logic: `frontend/studybuddy-frontend/src/components/TaskList.js` — it contains fetching, filtering, formatting, and action handlers (POST, PATCH, DELETE).
- Project settings / dev config: `backend/studybuddy_backend/settings.py` (CORS, INSTALLED_APPS, REST_FRAMEWORK).

Testing & debugging notes
- Frontend tests: run `npm test` from `frontend/studybuddy-frontend/` (CRA). The repository contains no backend `requirements.txt` or automated tests — backend `backend/tasks/tests.py` exists but is not populated.
- DB file: `backend/db.sqlite3` is committed here; you can inspect it or delete/regenerate if needed. Use `./backend/manage.py dbshell` or the Django admin if enabled.
- Debugging tips: check browser Network tab for requests to `http://127.0.0.1:8000/api/tasks/`. If 403 CORS errors appear, adjust `CORS_ALLOWED_ORIGINS`.

Small actionable improvements you can apply safely
- Add `requirements.txt` in `backend/` pinning Django, djangorestframework, django-cors-headers.
- Move API base URL into an environment variable or `src/config.js` instead of hard-coded `http://127.0.0.1:8000` in `TaskList.js`.

Files referenced frequently
- backend/studybuddy_backend/settings.py
- backend/manage.py
- backend/tasks/models.py
- backend/tasks/serializers.py
- backend/tasks/views.py
- backend/tasks/urls.py
- frontend/studybuddy-frontend/src/components/TaskList.js
- frontend/studybuddy-frontend/package.json

If anything here is missing or unclear, tell me what you'd like expanded (run steps, example requests, or more code pointers) and I will iterate.
