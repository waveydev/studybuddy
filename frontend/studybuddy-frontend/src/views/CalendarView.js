import React, { useMemo, useState } from 'react';
import Icon from '../components/Icon';
import TaskRow from '../components/TaskRow';
import { useStudy } from '../StudyContext';
import { addDays, dayKey, startOfDay } from '../utils/dates';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_PILLS = 2;

const CalendarView = () => {
  const { data, now, ui } = useStudy();
  const { tasks, courses } = data;
  const todayKey = dayKey(now);
  const [month, setMonth] = useState(() => {
    const d = startOfDay(now);
    d.setDate(1);
    return d;
  });
  const [selected, setSelected] = useState(todayKey);

  const byDay = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      if (!t.due_date) return;
      const k = dayKey(t.due_date);
      (map[k] = map[k] || []).push(t);
    });
    Object.values(map).forEach((list) => list.sort((a, b) => new Date(a.due_date) - new Date(b.due_date)));
    return map;
  }, [tasks]);

  // Six weeks starting on the Monday on or before the 1st.
  const cells = useMemo(() => {
    const offset = (month.getDay() + 6) % 7;
    const first = addDays(month, -offset);
    return Array.from({ length: 42 }, (_, i) => addDays(first, i));
  }, [month]);

  const shiftMonth = (n) => {
    const d = new Date(month);
    d.setMonth(d.getMonth() + n);
    setMonth(d);
  };

  const goToday = () => {
    const d = startOfDay(now);
    d.setDate(1);
    setMonth(d);
    setSelected(todayKey);
  };

  const colorOf = (task) => (courses.find((c) => c.id === task.course) || {}).color;
  const selectedTasks = byDay[selected] || [];
  const selectedDate = new Date(`${selected}T12:00`);

  return (
    <div className="view view-wide">
      <header className="page-head">
        <div>
          <h1>{month.toLocaleDateString([], { month: 'long', year: 'numeric' })}</h1>
          <p className="page-sub">Everything with a due date, by day.</p>
        </div>
        <div className="head-actions">
          <button type="button" className="btn btn-quiet" onClick={goToday}>Today</button>
          <button type="button" className="icon-btn icon-btn-outline" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
            <Icon name="chevron-left" />
          </button>
          <button type="button" className="icon-btn icon-btn-outline" aria-label="Next month" onClick={() => shiftMonth(1)}>
            <Icon name="chevron-right" />
          </button>
        </div>
      </header>

      <div className="cal-layout">
        <div className="card card-flush calendar">
          <div className="cal-weekdays">
            {WEEKDAYS.map((d) => <span key={d}>{d}</span>)}
          </div>
          <div className="cal-grid">
            {cells.map((date) => {
              const key = dayKey(date);
              const list = byDay[key] || [];
              const open = list.filter((t) => t.status !== 'completed');
              return (
                <button
                  key={key}
                  type="button"
                  className={[
                    'cal-cell',
                    date.getMonth() !== month.getMonth() ? 'is-outside' : '',
                    key === todayKey ? 'is-today' : '',
                    key === selected ? 'is-selected' : '',
                  ].join(' ')}
                  aria-label={`${date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}, ${list.length} ${list.length === 1 ? 'task' : 'tasks'}`}
                  aria-pressed={key === selected}
                  onClick={() => setSelected(key)}
                >
                  <span className="cal-date">{date.getDate()}</span>
                  <span className="cal-pills">
                    {list.slice(0, MAX_PILLS).map((t) => (
                      <span
                        key={t.id}
                        className={`cal-pill ${t.status === 'completed' ? 'is-done' : ''}`}
                        style={{ '--pill': colorOf(t) }}
                      >
                        {t.title}
                      </span>
                    ))}
                    {list.length > MAX_PILLS && <span className="cal-more">+{list.length - MAX_PILLS} more</span>}
                  </span>
                  {list.length > 0 && (
                    <span className="cal-dots" aria-hidden="true">
                      {list.slice(0, 4).map((t) => (
                        <i key={t.id} className="dot" style={{ background: colorOf(t) || 'var(--text-3)' }} />
                      ))}
                    </span>
                  )}
                  {open.length > 0 && <span className="sr-only">{open.length} open</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="card cal-day">
          <div className="card-head">
            <h2>
              {selected === todayKey ? 'Today' : selectedDate.toLocaleDateString([], { weekday: 'long' })}
              <span className="card-note"> {selectedDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
            </h2>
          </div>
          {selectedTasks.length === 0 ? (
            <p className="muted">Nothing due this day.</p>
          ) : (
            selectedTasks.map((t) => <TaskRow key={t.id} task={t} />)
          )}
          <button
            type="button"
            className="btn btn-quiet btn-block"
            onClick={() => ui.openCreate({ due_date: `${selected}T17:00` })}
          >
            <Icon name="plus" size={15} /> Add task for this day
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
