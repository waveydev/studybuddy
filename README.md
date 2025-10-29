# StudyBuddy

An approachable, animated study task manager built with a Django REST API backend and a React (Create React App) frontend. Track assignments, projects, and exams; filter by status and priority; and enjoy a clean, modern UI with subtle Framer Motion transitions.

## Features

- Task management with title, description, priority, category, and optional due date
- Quick filters: Pending, In Progress, Completed, Overdue, High Priority
- KPI snapshot cards: totals, completed, in-progress, overdue
- Smooth UI interactions and section transitions (Framer Motion)
- Debounced search across title/description/category/status
- Inline edit, status updates, and delete actions

## Tech stack

- Backend: Django + Django REST Framework (DRF)
- Frontend: React (CRA) + Axios + Framer Motion
- DB: SQLite (default, committed for local ease)

## Repository structure

```
backend/                 # Django project (studybuddy_backend) and tasks app
frontend/
	studybuddy-frontend/   # React app (Create React App)
```

## Quick start

Clone the repository and run the backend and frontend in separate terminals.

### 1) Backend (Django API)

From the repo root:

```bash
python -m venv .venv
source .venv/bin/activate
pip install django djangorestframework django-cors-headers

./backend/manage.py migrate
./backend/manage.py runserver  # http://127.0.0.1:8000
```

Notes:
- CORS: The backend allows http://localhost:3000 by default. If you run the frontend on a different host (e.g., http://127.0.0.1:3000), add it to `backend/studybuddy_backend/settings.py` under `CORS_ALLOWED_ORIGINS`.
- Database: A SQLite DB file (`backend/db.sqlite3`) is included for convenience. You can delete it to start fresh.

### 2) Frontend (React)

In a new terminal:

```bash
cd frontend/studybuddy-frontend
npm install
npm start  # http://localhost:3000
```

By default, the frontend calls the API at `http://127.0.0.1:8000`. Ensure your backend is running there, or update the API base URL in the code if you change it.

## API overview

Base URL (default): `http://127.0.0.1:8000`

Endpoints (prefix: `/api/tasks/`):

- GET `/api/tasks/` — list tasks
- POST `/api/tasks/` — create task
- GET `/api/tasks/<id>/` — retrieve a task
- PATCH `/api/tasks/<id>/` — partial update
- DELETE `/api/tasks/<id>/` — delete

Task fields (serializer):

- id, title, description, priority, status, category, due_date, created_at, updated_at
- Computed (read-only): `is_overdue`, `days_until_due`

Example POST payload:

```json
{
	"title": "Study chapter 3",
	"description": "Focus on sections 3.1–3.4",
	"priority": "medium",
	"category": "assignment",
	"due_date": "2025-10-30T14:00:00Z"
}
```

## Running tests

Frontend tests (Jest via CRA):

```bash
cd frontend/studybuddy-frontend
npm test
```

There are currently no Django unit tests included; feel free to add them under `backend/tasks/tests.py`.

## Troubleshooting

- CORS 403 in browser: Add your frontend origin (e.g., `http://127.0.0.1:3000`) to `CORS_ALLOWED_ORIGINS` in `backend/studybuddy_backend/settings.py` and restart the server.
- Port already in use: Change ports or stop the existing process (`lsof -i :3000` / `lsof -i :8000`).
- API not reachable from frontend: Confirm backend is on `http://127.0.0.1:8000` and that the URL matches what the frontend uses.

## Contributing

Issues and PRs are welcome. For larger changes, please open an issue to discuss your idea first. Consider adding tests for user-facing or API changes.

---

Happy studying! 📚
