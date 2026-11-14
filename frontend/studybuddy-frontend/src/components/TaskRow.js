import React from 'react';
import Icon from './Icon';
import { useStudy } from '../StudyContext';
import { dueInfo, formatMinutes } from '../utils/dates';
import { CATEGORIES, labelOf } from '../utils/constants';

/** The small line of facts under a task title; shared by rows and board cards. */
export const TaskMeta = ({ task, hideCourse = false }) => {
  const { data, now } = useStudy();
  const course = data.courses.find((c) => c.id === task.course);
  const due = dueInfo(task, now);
  const subtasks = task.subtasks || [];
  const done = task.status === 'completed';

  return (
    <span className="task-meta">
      {course && !hideCourse && (
        <span className="meta-item">
          <i className="dot" style={{ background: course.color }} />
          {course.name}
        </span>
      )}
      {due.tone !== 'none' && <span className={`due tone-${due.tone}`}>{due.label}</span>}
      {task.priority === 'high' && !done && <span className="chip chip-high">High priority</span>}
      {task.category !== 'other' && <span className="chip">{labelOf(CATEGORIES, task.category)}</span>}
      {task.status === 'in_progress' && <span className="chip chip-progress">In progress</span>}
      {subtasks.length > 0 && (
        <span className="meta-item">
          <Icon name="checklist" size={13} />
          {subtasks.filter((s) => s.done).length}/{subtasks.length}
        </span>
      )}
      {task.estimated_minutes ? (
        <span className="meta-item">
          <Icon name="clock" size={13} />
          {formatMinutes(task.estimated_minutes)}
        </span>
      ) : null}
    </span>
  );
};

const TaskRow = ({ task, hideCourse = false }) => {
  const { data, ui } = useStudy();
  const done = task.status === 'completed';

  return (
    <div className={`task-row ${done ? 'is-done' : ''}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Reopen ${task.title}` : `Mark ${task.title} as done`}
        title={done ? 'Reopen' : 'Mark as done'}
        className={`check prio-${task.priority}`}
        onClick={() => data.setStatus(task.id, done ? 'pending' : 'completed')}
      >
        {done && <Icon name="check" size={14} />}
      </button>

      <button type="button" className="task-main" onClick={() => ui.openTask(task.id)}>
        <span className="task-title">{task.title}</span>
        <TaskMeta task={task} hideCourse={hideCourse} />
      </button>

      <div className="task-actions">
        {!done && (
          <button
            type="button"
            className="icon-btn"
            title="Focus on this task"
            aria-label={`Start a focus session on ${task.title}`}
            onClick={() => ui.startFocus(task.id)}
          >
            <Icon name="play" size={16} />
          </button>
        )}
        <button
          type="button"
          className="icon-btn icon-btn-danger"
          title="Delete"
          aria-label={`Delete ${task.title}`}
          onClick={() => data.deleteTask(task.id)}
        >
          <Icon name="trash" size={16} />
        </button>
      </div>
    </div>
  );
};

export default TaskRow;
