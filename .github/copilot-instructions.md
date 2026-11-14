## StudyBuddy — AI assistant instructions

Short orientation
- Backend: Django REST API at `backend/` (project: `studybuddy_backend`). The `tasks` app holds all models and endpoints: `Task`, `Subtask`, `Course`, `StudySession`.
- Frontend: React app at `frontend/studybuddy-frontend/` (Create React App + axios + framer-motion + react-hot-toast). No UI framework; all styling is in `src/styles/app.css`.
- DB: SQLite at `backend/db.sqlite3` (git-ignored, created by `migrate`). Python deps are in `backend/requirements.txt`.

Dev / run commands
- Backend (from repo root): `python -m venv .venv && .venv/bin/pip install -r backend/requirements.txt`, then `python backend/manage.py migrate` and `python backend/manage.py runserver` (http://127.0.0.1:8000).
- Frontend: `cd frontend/studybuddy-frontend && npm install && npm start` (http://localhost:3000).
- Tests: `python manage.py test tasks` in `backend/`; `npm test` in the frontend.

API surface (see `backend/tasks/urls.py`)
- `/api/tasks/` GET, POST; `/api/tasks/<id>/` GET, PATCH, DELETE
- `/api/tasks/<id>/subtasks/` POST; `/api/subtasks/<id>/` PATCH, DELETE
- `/api/courses/` GET, POST; `/api/courses/<id>/` GET, PATCH, DELETE
- `/api/sessions/` GET (last 120 days), POST
- Task serializer: writable `title, description, priority, status, category, course, due_date, estimated_minutes`; read-only `id, completed_at, created_at, updated_at, is_overdue, days_until_due, subtasks, focus_minutes`.

Frontend layout (`frontend/studybuddy-frontend/src/`)
- `App.js`: shell (sidebar / bottom nav), view switching, theme, task modal, keyboard shortcuts. Provides `StudyContext`.
- `StudyContext.js`: `useStudy()` returns `{ data, timer, now, ui }`. Views read everything from it; do not prop-drill.
- `hooks/useStudyData.js`: all API calls and state for tasks, courses, sessions. Updates are optimistic with rollback. Task delete is deferred 5 s to allow undo.
- `hooks/useFocusTimer.js`: Pomodoro timer; lives at the app root so it survives view changes.
- `views/`: `Dashboard`, `TasksView`, `BoardView`, `CalendarView`, `FocusView`, `CoursesView`.
- `components/`: `TaskRow` (+ `TaskMeta`), `TaskModal`, `Icon` (inline SVG set).
- `utils/`: `dates.js` (due labels, buckets, formatting), `stats.js` (streak, focus per day), `constants.js`.
- `api.js`: axios instance; base URL from `REACT_APP_API_URL`, default `http://127.0.0.1:8000`.

Patterns and gotchas
- CORS: `CORS_ALLOWED_ORIGINS` allows `localhost:3000` and `127.0.0.1:3000`; add others in `settings.py`.
- No authentication: `AllowAny`. `Task.user` exists but is unused.
- `Task.save()` sets `completed_at` when status becomes `completed` and clears it otherwise. Streaks and "done today" depend on it.
- `StudySession.save()` copies the task's course when none is given.
- "Today", streaks and due labels are computed in the browser's local time zone (`utils/dates.js`), not on the server. `days_until_due` from the API is UTC-based and unused by the frontend.
- Priority is a string choice; sorting by priority happens client-side via `PRIORITY_RANK`.
- Dates: `datetime-local` values go through `toIsoOrNull` / `toDatetimeLocal` in `utils/dates.js`.
- Colors come from CSS variables in `app.css` (`:root` light, `:root[data-theme='dark']` dark). Course colors are the only extra hues; keep it that way.
- Frontend tests mock `./api` with plain functions, not `jest.fn` (CRA resets `jest.fn` implementations between tests).
