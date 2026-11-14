import React from 'react';
import Icon from '../components/Icon';
import TaskRow from '../components/TaskRow';
import { useStudy } from '../StudyContext';
import { dayDiff, dayKey, dueInfo, formatMinutes, greeting } from '../utils/dates';
import { currentStreak, focusByDay } from '../utils/stats';

const byDue = (a, b) => new Date(a.due_date) - new Date(b.due_date);

const ProgressRing = ({ value }) => {
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <svg className="ring" viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
      <circle className="ring-track" cx="24" cy="24" r={r} />
      <circle
        className="ring-fill"
        cx="24"
        cy="24"
        r={r}
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(1, value))}
        transform="rotate(-90 24 24)"
      />
    </svg>
  );
};

const FocusChart = ({ days }) => {
  const max = Math.max(...days.map((d) => d.minutes), 1);
  return (
    <div className="bars" role="list" aria-label="Focus minutes per day, last 7 days">
      {days.map((d) => {
        const weekday = d.date.toLocaleDateString([], { weekday: 'short' });
        return (
          <div
            key={d.date.getTime()}
            className={`bar-col ${d.isToday ? 'is-today' : ''}`}
            role="listitem"
            tabIndex={0}
            aria-label={`${weekday}: ${formatMinutes(d.minutes)} focused`}
          >
            <div className="bar-track">
              <span className="bar-tip">{formatMinutes(d.minutes)}</span>
              <div
                className={`bar ${d.minutes === 0 ? 'is-empty' : ''}`}
                style={{ '--h': d.minutes === 0 ? 0 : Math.max(0.06, d.minutes / max) }}
              />
            </div>
            <span className="bar-label">{d.isToday ? 'Today' : weekday}</span>
          </div>
        );
      })}
    </div>
  );
};

const Section = ({ title, tone, tasks }) =>
  tasks.length === 0 ? null : (
    <section className="plan-section">
      <h3 className={`group-title ${tone ? `tone-${tone}` : ''}`}>
        {title} <span className="count">{tasks.length}</span>
      </h3>
      {tasks.map((t) => <TaskRow key={t.id} task={t} />)}
    </section>
  );

const Dashboard = () => {
  const { data, now, ui } = useStudy();
  const { tasks, sessions, courses, loading } = data;

  const open = tasks.filter((t) => t.status !== 'completed');
  const bucketOf = (t) => dueInfo(t, now).bucket;
  const overdue = open.filter((t) => bucketOf(t) === 'overdue').sort(byDue);
  const today = open.filter((t) => bucketOf(t) === 'today').sort(byDue);
  const upcoming = open
    .filter((t) => ['tomorrow', 'week'].includes(bucketOf(t)))
    .sort(byDue)
    .slice(0, 6);
  const doneToday = tasks.filter((t) => t.completed_at && dayKey(t.completed_at) === dayKey(now));
  const doneThisWeek = tasks.filter((t) => t.completed_at && dayDiff(now, t.completed_at) < 7);

  const todayTotal = today.length + overdue.length + doneToday.length;
  const streak = currentStreak(tasks, sessions, now);
  const week = focusByDay(sessions, 7, now);
  const weekMinutes = week.reduce((sum, d) => sum + d.minutes, 0);
  const todayMinutes = week[week.length - 1].minutes;

  const exams = open
    .filter((t) => t.category === 'exam' && t.due_date && new Date(t.due_date).getTime() > now)
    .sort(byDue)
    .slice(0, 4);

  const summary =
    overdue.length > 0
      ? `${overdue.length} overdue and ${today.length} due today.`
      : today.length > 0
      ? `${today.length} ${today.length === 1 ? 'task' : 'tasks'} due today.`
      : open.length > 0
      ? 'Nothing due today. Get ahead or take a breather.'
      : 'No open tasks. Add what is coming up.';

  const planEmpty = overdue.length + today.length + upcoming.length === 0;

  return (
    <div className="view">
      <header className="page-head">
        <div>
          <h1>{greeting(now)}</h1>
          <p className="page-sub">
            {new Date(now).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
            {' · '}{summary}
          </p>
        </div>
      </header>

      <div className="tiles">
        <div className="tile">
          <ProgressRing value={todayTotal ? doneToday.length / todayTotal : 0} />
          <div>
            <div className="tile-value">{doneToday.length}<span className="tile-of"> / {todayTotal}</span></div>
            <div className="tile-label">Done today</div>
          </div>
        </div>
        <div className="tile">
          <span className={`tile-icon ${streak > 0 ? 'is-hot' : ''}`}><Icon name="flame" size={22} /></span>
          <div>
            <div className="tile-value">{streak}<span className="tile-of"> {streak === 1 ? 'day' : 'days'}</span></div>
            <div className="tile-label">Study streak</div>
          </div>
        </div>
        <div className="tile">
          <span className="tile-icon"><Icon name="timer" size={22} /></span>
          <div>
            <div className="tile-value">{formatMinutes(todayMinutes)}</div>
            <div className="tile-label">Focused today</div>
          </div>
        </div>
        <div className="tile">
          <span className="tile-icon"><Icon name="check" size={22} /></span>
          <div>
            <div className="tile-value">{doneThisWeek.length}</div>
            <div className="tile-label">Done in 7 days</div>
          </div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="card">
          <div className="card-head">
            <h2>Your plan</h2>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => ui.setView('tasks')}>All tasks</button>
          </div>
          {loading ? (
            <div className="skeleton-list">{[0, 1, 2].map((i) => <div key={i} className="skeleton-row" />)}</div>
          ) : planEmpty ? (
            <div className="empty">
              <h3>{open.length ? 'Nothing due in the next week' : 'Plan your week'}</h3>
              <p>{open.length ? 'Your open tasks have later or no due dates.' : 'Add assignments, exams and readings and they will line up here by due date.'}</p>
              <button type="button" className="btn btn-primary" onClick={() => ui.openCreate()}>
                <Icon name="plus" size={16} /> Add a task
              </button>
            </div>
          ) : (
            <>
              <Section title="Overdue" tone="overdue" tasks={overdue} />
              <Section title="Today" tasks={today} />
              <Section title="Coming up" tasks={upcoming} />
            </>
          )}
        </div>

        <div className="dash-side">
          <div className="card">
            <div className="card-head">
              <h2>Focus time</h2>
              <span className="card-note">{formatMinutes(weekMinutes)} in 7 days</span>
            </div>
            <FocusChart days={week} />
            <button type="button" className="btn btn-quiet btn-block" onClick={() => ui.startFocus(null)}>
              <Icon name="play" size={15} /> Start a focus session
            </button>
          </div>

          <div className="card">
            <div className="card-head"><h2>Exams</h2></div>
            {exams.length === 0 ? (
              <p className="muted">No exams scheduled. Add one with type “Exam” to see a countdown.</p>
            ) : (
              <ul className="countdowns">
                {exams.map((t) => {
                  const days = dayDiff(t.due_date, now);
                  const course = courses.find((c) => c.id === t.course);
                  return (
                    <li key={t.id}>
                      <button type="button" onClick={() => ui.openTask(t.id)}>
                        <span className={`countdown ${days <= 3 ? 'is-near' : ''}`}>
                          <strong>{days}</strong>
                          {days === 1 ? 'day' : 'days'}
                        </span>
                        <span className="countdown-text">
                          <span className="task-title">{t.title}</span>
                          <span className="task-meta">
                            {course && (
                              <span className="meta-item">
                                <i className="dot" style={{ background: course.color }} />{course.name}
                              </span>
                            )}
                            <span className="meta-item">
                              {new Date(t.due_date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                            </span>
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
