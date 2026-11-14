# StudyBuddy


https://github.com/user-attachments/assets/73d96176-47a1-4a92-a37e-5ad16ae01acc


A study planner for students, built with a Django REST API backend and a React (Create React App) frontend. Plan coursework by class, see what is due today, break big tasks into steps, and log focused study time.

## Features

- **Today**: overdue, due-today and upcoming tasks in one plan, with daily progress, study streak, a 7-day focus chart and exam countdowns
- **Tasks**: one-click completion, search (press `/`), filters by course and type, sorting, and grouping by due date
- **Board**: To do / In progress / Done columns with drag and drop
- **Calendar**: month view of everything with a due date; add a task straight onto a day
- **Focus**: Pomodoro-style timer (focus / short break / long break) that logs finished sessions against a task
- **Courses**: color-coded classes with progress, focus time and next deadline
- Tasks have notes, priority, type, due date, time estimate and checklist steps
- Light and dark themes, phone layout, delete with undo, `N` to add a task from anywhere

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
pip install -r backend/requirements.txt

python backend/manage.py migrate
python backend/manage.py runserver  # http://127.0.0.1:8000
```

Notes:
- CORS: The backend allows http://localhost:3000 and http://127.0.0.1:3000. For any other frontend origin, add it to `CORS_ALLOWED_ORIGINS` in `backend/studybuddy_backend/settings.py`.
- Database: SQLite at `backend/db.sqlite3`, created by `migrate` and ignored by git. Delete it and migrate again to start fresh.

### 2) Frontend (React)

In a new terminal:

```bash
cd frontend/studybuddy-frontend
npm install
npm start  # http://localhost:3000
```

By default, the frontend calls the API at `http://127.0.0.1:8000`. To point it elsewhere, set `REACT_APP_API_URL` (for example in `frontend/studybuddy-frontend/.env`) and restart `npm start`.

## API overview

Base URL (default): `http://127.0.0.1:8000`

| Endpoint | Methods | Purpose |
|---|---|---|
| `/api/tasks/` | GET, POST | List / create tasks |
| `/api/tasks/<id>/` | GET, PATCH, DELETE | One task |
| `/api/tasks/<id>/subtasks/` | POST | Add a checklist step |
| `/api/subtasks/<id>/` | PATCH, DELETE | Tick off / remove a step |
| `/api/courses/` | GET, POST | List / create courses |
| `/api/courses/<id>/` | GET, PATCH, DELETE | One course (deleting keeps its tasks) |
| `/api/sessions/` | GET, POST | Focus sessions from the last 120 days / log one |

Task fields:

- Writable: `title`, `description`, `priority`, `status`, `category`, `course`, `due_date`, `estimated_minutes`
- Read-only: `id`, `completed_at`, `created_at`, `updated_at`, `is_overdue`, `days_until_due`, `subtasks`, `focus_minutes`

Example POST payload:

```json
{
	"title": "Study chapter 3",
	"description": "Focus on sections 3.1–3.4",
	"priority": "medium",
	"category": "assignment",
	"course": 1,
	"estimated_minutes": 45,
	"due_date": "2025-10-30T14:00:00Z"
}
```

## Running tests

```bash
# Frontend (Jest via CRA)
cd frontend/studybuddy-frontend
npm test

# Backend
cd backend
python manage.py test tasks
```

## Troubleshooting

- CORS 403 in browser: Add your frontend origin (e.g., `http://127.0.0.1:3000`) to `CORS_ALLOWED_ORIGINS` in `backend/studybuddy_backend/settings.py` and restart the server.
- Port already in use: Change ports or stop the existing process (`lsof -i :3000` / `lsof -i :8000`).
- API not reachable from frontend: Confirm backend is on `http://127.0.0.1:8000` and that the URL matches what the frontend uses.

## Contributing

Issues and PRs are welcome. For larger changes, please open an issue to discuss your idea first. Consider adding tests for user-facing or API changes.

---

Happy studying! 📚
