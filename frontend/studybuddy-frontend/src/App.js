import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import './styles/app.css';
import { API_BASE } from './api';
import StudyContext from './StudyContext';
import useStudyData from './hooks/useStudyData';
import useFocusTimer, { formatClock } from './hooks/useFocusTimer';
import Icon from './components/Icon';
import Logo from './components/Logo';
import TaskModal from './components/TaskModal';
import Dashboard from './views/Dashboard';
import TasksView from './views/TasksView';
import BoardView from './views/BoardView';
import CalendarView from './views/CalendarView';
import FocusView from './views/FocusView';
import CoursesView from './views/CoursesView';
import { dueInfo } from './utils/dates';

const VIEWS = [
  { key: 'today', label: 'Today', icon: 'today', Component: Dashboard },
  { key: 'tasks', label: 'Tasks', icon: 'list', Component: TasksView },
  { key: 'board', label: 'Board', icon: 'board', Component: BoardView },
  { key: 'calendar', label: 'Calendar', icon: 'calendar', Component: CalendarView },
  { key: 'focus', label: 'Focus', icon: 'timer', Component: FocusView },
  { key: 'courses', label: 'Courses', icon: 'book', Component: CoursesView },
];

const stored = (key) => {
  try { return localStorage.getItem(key); } catch { return null; }
};
const store = (key, value) => {
  try { localStorage.setItem(key, value); } catch { /* private mode */ }
};

const systemPrefersDark = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;

function App() {
  const data = useStudyData();
  const { logSession } = data;

  const [view, setViewState] = useState(() =>
    VIEWS.some((v) => v.key === stored('sb:view')) ? stored('sb:view') : 'today');
  const [theme, setTheme] = useState(() => stored('sb:theme') || (systemPrefersDark() ? 'dark' : 'light'));
  const [modal, setModal] = useState(null); // { taskId } | { defaults }
  const [now, setNow] = useState(Date.now());

  const timer = useFocusTimer({
    onFocusEnd: async ({ minutes, taskId, startedAt }) => {
      const ok = await logSession({ minutes, taskId, startedAt });
      if (ok) toast.success(`${minutes} min of focus logged. Take a break.`);
    },
  });

  // Due labels and "today" roll over on their own.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    store('sb:theme', theme);
  }, [theme]);

  useEffect(() => {
    document.title = timer.running
      ? `${formatClock(timer.remaining)} · ${timer.mode === 'focus' ? 'Focus' : 'Break'} · StudyBuddy`
      : 'StudyBuddy';
  }, [timer.running, timer.remaining, timer.mode]);

  const setView = useCallback((next) => {
    setViewState(next);
    store('sb:view', next);
    window.scrollTo(0, 0);
  }, []);

  const closeModal = useCallback(() => setModal(null), []);
  const { selectTask } = timer;

  const ui = useMemo(() => ({
    setView,
    openTask: (taskId) => setModal({ taskId }),
    openCreate: (defaults) => setModal({ defaults: defaults || {} }),
    startFocus: (taskId) => {
      if (taskId) selectTask(taskId);
      setView('focus');
    },
  }), [setView, selectTask]);

  // "n" opens a new task from anywhere.
  useEffect(() => {
    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
      if (e.key === 'n' && !typing && !modal && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        ui.openCreate();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal, ui]);

  const dueNow = data.tasks.filter(
    (t) => t.status !== 'completed' && ['overdue', 'today'].includes(dueInfo(t, now).bucket),
  ).length;

  const current = VIEWS.find((v) => v.key === view) || VIEWS[0];
  const context = { data, timer, now, ui };

  return (
    <StudyContext.Provider value={context}>
      <div className="App shell">
        <Toaster position="bottom-center" toastOptions={{ className: 'toast' }} />

        <aside className="sidebar">
          <div className="brand">
            <Logo />
          </div>

          <button type="button" className="btn btn-primary btn-block new-task" onClick={() => ui.openCreate()}>
            <Icon name="plus" size={16} /> New task <kbd>N</kbd>
          </button>

          <nav className="nav" aria-label="Main">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                type="button"
                className={`nav-item ${view === v.key ? 'is-active' : ''}`}
                aria-current={view === v.key ? 'page' : undefined}
                onClick={() => setView(v.key)}
              >
                <Icon name={v.icon} />
                <span className="nav-label">{v.label}</span>
                {v.key === 'today' && dueNow > 0 && <span className="badge">{dueNow}</span>}
                {v.key === 'focus' && timer.started && (
                  <span className={`badge badge-timer ${timer.running ? 'is-running' : ''}`}>
                    {formatClock(timer.remaining)}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <button
            type="button"
            className="nav-item theme-toggle"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Icon name={theme === 'dark' ? 'today' : 'moon'} />
            <span className="nav-label">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>
        </aside>

        <main className="main">
          {data.loadError && (
            <div className="banner" role="alert">
              <span>
                Can’t reach the StudyBuddy server at <code>{API_BASE}</code>. Start the backend, then try again.
              </span>
              <button type="button" className="btn btn-quiet btn-sm" onClick={data.reload}>Retry</button>
            </div>
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current.key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
            >
              <current.Component />
            </motion.div>
          </AnimatePresence>
        </main>

        <button type="button" className="fab" aria-label="New task" onClick={() => ui.openCreate()}>
          <Icon name="plus" size={24} />
        </button>

        <AnimatePresence>
          {modal && (
            <TaskModal
              key={modal.taskId || 'new'}
              taskId={modal.taskId}
              defaults={modal.defaults}
              onClose={closeModal}
            />
          )}
        </AnimatePresence>
      </div>
    </StudyContext.Provider>
  );
}

export default App;
