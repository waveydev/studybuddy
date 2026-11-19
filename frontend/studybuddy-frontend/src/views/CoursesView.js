import React, { useState } from 'react';
import Icon from '../components/Icon';
import { useStudy } from '../StudyContext';
import { COURSE_COLORS } from '../utils/constants';
import { dueInfo, formatMinutes } from '../utils/dates';

// Short label for the course badge: first token of the code ("CS 101" -> "CS"),
// otherwise initials of the first two words of the name.
const monogram = (course) => {
  const code = (course.code || '').trim();
  if (code) return code.split(/[\s\-_]+/)[0].slice(0, 4).toUpperCase();
  return course.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
};

const ProgressRing = ({ pct, label }) => {
  const r = 17;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring" role="img" aria-label={label}>
      <svg viewBox="0 0 40 40" width="48" height="48">
        <circle className="ring-track" cx="20" cy="20" r={r} />
        <circle
          className="ring-fill"
          cx="20"
          cy="20"
          r={r}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
        />
      </svg>
      <span className="ring-value">{pct}<small>%</small></span>
    </div>
  );
};

const CourseForm =({ initial, submitLabel, onSubmit, onCancel }) => {
  const [name, setName] = useState(initial?.name || '');
  const [code, setCode] = useState(initial?.code || '');
  const [color, setColor] = useState(initial?.color || COURSE_COLORS[3]);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    const ok = await onSubmit({ name: name.trim(), code: code.trim(), color });
    setBusy(false);
    if (ok && !initial) {
      setName('');
      setCode('');
    }
  };

  return (
    <form className="course-form" onSubmit={submit}>
      <input
        className="input"
        placeholder="Course name, e.g. Organic Chemistry"
        aria-label="Course name"
        value={name}
        maxLength={80}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input
        className="input course-code"
        placeholder="Code (optional)"
        aria-label="Course code"
        value={code}
        maxLength={20}
        onChange={(e) => setCode(e.target.value)}
      />
      <div className="swatches" role="radiogroup" aria-label="Course color">
        {COURSE_COLORS.map((c, i) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={color === c}
            aria-label={`Color ${i + 1}`}
            className={`swatch ${color === c ? 'is-active' : ''}`}
            style={{ background: c }}
            onClick={() => setColor(c)}
          >
            {color === c && <Icon name="check" size={13} />}
          </button>
        ))}
      </div>
      <div className="course-form-actions">
        {onCancel && <button type="button" className="btn btn-quiet" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>{submitLabel}</button>
      </div>
    </form>
  );
};

const CoursesView = () => {
  const { data, now, ui } = useStudy();
  const { courses, tasks, sessions, loading } = data;
  const [editingId, setEditingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  return (
    <div className="view">
      <header className="page-head">
        <div>
          <h1>Courses</h1>
          <p className="page-sub">Group tasks by class and see where your time goes.</p>
        </div>
      </header>

      <div className="card">
        <div className="card-head"><h2>Add a course</h2></div>
        <CourseForm submitLabel="Add course" onSubmit={data.createCourse} />
      </div>

      {!loading && courses.length === 0 ? (
        <div className="card">
          <div className="empty">
            <h3>No courses yet</h3>
            <p>Add the classes you are taking this term. Each gets a color that follows its tasks around the app.</p>
          </div>
        </div>
      ) : (
        <div className="course-grid">
          {courses.map((course) => {
            const mine = tasks.filter((t) => t.course === course.id);
            const done = mine.filter((t) => t.status === 'completed').length;
            const open = mine.length - done;
            const minutes = sessions.reduce((sum, s) => (s.course === course.id ? sum + s.minutes : sum), 0);
            const next = mine
              .filter((t) => t.status !== 'completed' && t.due_date)
              .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];
            const nextDue = next ? dueInfo(next, now) : null;

            if (editingId === course.id) {
              return (
                <div key={course.id} className="card course-card" style={{ '--course': course.color }}>
                  <CourseForm
                    initial={course}
                    submitLabel="Save"
                    onCancel={() => setEditingId(null)}
                    onSubmit={async (values) => {
                      const ok = await data.updateCourse(course.id, values);
                      if (ok) setEditingId(null);
                      return ok;
                    }}
                  />
                </div>
              );
            }

            const pct = mine.length ? Math.round((done / mine.length) * 100) : 0;
            const badge = monogram(course);

            return (
              <article key={course.id} className="card course-card" style={{ '--course': course.color }}>
                <div className="course-top">
                  <span className="course-badge" data-len={badge.length} aria-hidden="true">{badge}</span>
                  <div className="course-title">
                    <h2>{course.name}</h2>
                    {course.code && <span className="course-code">{course.code}</span>}
                  </div>
                  <div className="course-actions">
                    <button type="button" className="icon-btn" aria-label={`Edit ${course.name}`} title="Edit" onClick={() => setEditingId(course.id)}>
                      <Icon name="edit" size={16} />
                    </button>
                    {confirmId === course.id ? (
                      <button
                        type="button"
                        className="btn btn-danger-quiet btn-sm"
                        onBlur={() => setConfirmId(null)}
                        onClick={() => { data.deleteCourse(course.id); setConfirmId(null); }}
                      >
                        Confirm delete
                      </button>
                    ) : (
                      <button type="button" className="icon-btn icon-btn-danger" aria-label={`Delete ${course.name}`} title="Delete" onClick={() => setConfirmId(course.id)}>
                        <Icon name="trash" size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="course-stats">
                  <ProgressRing pct={pct} label={`${done} of ${mine.length} tasks done`} />
                  <div className="course-stat">
                    <strong>{open}</strong>
                    <span>Open</span>
                  </div>
                  <div className="course-stat">
                    <strong>{done}</strong>
                    <span>Done</span>
                  </div>
                  <div className="course-stat">
                    <strong>{formatMinutes(minutes)}</strong>
                    <span>Focused</span>
                  </div>
                </div>

                <div className="course-foot">
                  {next ? (
                    <button type="button" className="course-next" onClick={() => ui.openTask(next.id)}>
                      <span className="course-next-label">Next up</span>
                      <span className="course-next-title">{next.title}</span>
                      <span className={`due-pill tone-${nextDue.tone}`}>{nextDue.label}</span>
                    </button>
                  ) : (
                    <p className="course-next course-next-empty">
                      <Icon name="check" size={15} /> All caught up
                    </p>
                  )}
                  <button
                    type="button"
                    className="course-add"
                    aria-label={`Add task to ${course.name}`}
                    title="Add task"
                    onClick={() => ui.openCreate({ course: course.id })}
                  >
                    <Icon name="plus" size={18} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CoursesView;
