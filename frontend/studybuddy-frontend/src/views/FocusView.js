import React from 'react';
import Icon from '../components/Icon';
import { useStudy } from '../StudyContext';
import { formatClock } from '../hooks/useFocusTimer';
import { dayKey, formatMinutes, formatTime } from '../utils/dates';

const MODES = [
  { value: 'focus', label: 'Focus' },
  { value: 'short', label: 'Short break' },
  { value: 'long', label: 'Long break' },
];

const R = 132;
const CIRCUMFERENCE = 2 * Math.PI * R;

const FocusView = () => {
  const { data, timer, now } = useStudy();
  const { tasks, sessions } = data;
  const openTasks = tasks.filter((t) => t.status !== 'completed');
  const task = tasks.find((t) => t.id === timer.taskId) || null;

  const progress = 1 - timer.remaining / timer.total;
  const todaySessions = sessions.filter((s) => dayKey(s.started_at) === dayKey(now));
  const todayMinutes = todaySessions.reduce((sum, s) => sum + s.minutes, 0);
  const isFocus = timer.mode === 'focus';

  return (
    <div className="view">
      <header className="page-head">
        <div>
          <h1>Focus</h1>
          <p className="page-sub">Work in short blocks, rest in between. Finished blocks are logged for you.</p>
        </div>
      </header>

      <div className="focus-grid">
        <div className="card focus-card">
          <div className="segmented" role="radiogroup" aria-label="Timer mode">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={timer.mode === m.value}
                className={timer.mode === m.value ? 'is-active' : ''}
                onClick={() => timer.switchMode(m.value)}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className={`dial ${isFocus ? '' : 'is-break'}`}>
            <svg viewBox="0 0 300 300" aria-hidden="true">
              <circle className="dial-track" cx="150" cy="150" r={R} />
              <circle
                className="dial-fill"
                cx="150"
                cy="150"
                r={R}
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
                transform="rotate(-90 150 150)"
              />
            </svg>
            <div className="dial-center">
              <div className="dial-time" role="timer" aria-live="off">{formatClock(timer.remaining)}</div>
              <div className="dial-caption">
                {isFocus ? (task ? task.title : 'Free study') : 'Step away for a bit'}
              </div>
            </div>
          </div>

          <div className="focus-controls">
            {timer.running ? (
              <button type="button" className="btn btn-primary btn-lg" onClick={timer.pause}>
                <Icon name="pause" size={18} /> Pause
              </button>
            ) : (
              <button type="button" className="btn btn-primary btn-lg" onClick={timer.start}>
                <Icon name="play" size={18} /> {timer.started ? 'Resume' : 'Start'}
              </button>
            )}
            {timer.started && (
              <>
                <button type="button" className="btn btn-quiet" onClick={timer.finishEarly}>
                  {isFocus ? 'Finish and log' : 'Skip break'}
                </button>
                <button type="button" className="icon-btn icon-btn-outline" aria-label="Reset timer" title="Reset" onClick={timer.reset}>
                  <Icon name="reset" />
                </button>
              </>
            )}
          </div>

          <label className="field focus-task">
            <span className="field-label">Working on</span>
            <select
              className="input"
              value={timer.taskId ?? ''}
              onChange={(e) => timer.selectTask(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Free study (no task)</option>
              {openTasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </label>
          {task && (
            <div className="focus-task-info">
              <span>
                {formatMinutes(task.focus_minutes || 0)} focused
                {task.estimated_minutes ? ` of ${formatMinutes(task.estimated_minutes)} planned` : ''}
              </span>
              <button
                type="button"
                className="btn btn-quiet btn-sm"
                onClick={() => { data.setStatus(task.id, 'completed'); timer.selectTask(null); }}
              >
                <Icon name="check" size={14} /> Mark done
              </button>
            </div>
          )}

          <details className="focus-settings">
            <summary>Timer lengths</summary>
            <div className="field-grid field-grid-3">
              {MODES.map((m) => (
                <label key={m.value} className="field">
                  <span className="field-label">{m.label} (min)</span>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    className="input"
                    value={timer.durations[m.value]}
                    onChange={(e) => timer.setDuration(m.value, e.target.value)}
                  />
                </label>
              ))}
            </div>
          </details>
        </div>

        <div className="dash-side">
          <div className="card">
            <div className="card-head"><h2>Today</h2></div>
            <div className="mini-stats">
              <div>
                <div className="tile-value">{formatMinutes(todayMinutes)}</div>
                <div className="tile-label">Focused</div>
              </div>
              <div>
                <div className="tile-value">{todaySessions.length}</div>
                <div className="tile-label">{todaySessions.length === 1 ? 'Session' : 'Sessions'}</div>
              </div>
              <div>
                <div className="tile-value">{timer.rounds % 4}<span className="tile-of"> / 4</span></div>
                <div className="tile-label">To long break</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h2>Recent sessions</h2></div>
            {sessions.length === 0 ? (
              <p className="muted">Finish a focus block and it will be logged here.</p>
            ) : (
              <ul className="session-list">
                {sessions.slice(0, 8).map((s) => {
                  const sTask = tasks.find((t) => t.id === s.task);
                  const isToday = dayKey(s.started_at) === dayKey(now);
                  return (
                    <li key={s.id}>
                      <span className="session-what">{sTask ? sTask.title : 'Free study'}</span>
                      <span className="session-when">
                        {isToday ? formatTime(s.started_at) : new Date(s.started_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="session-min">{formatMinutes(s.minutes)}</span>
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

export default FocusView;
