import React, { useState } from 'react';
import Icon from '../components/Icon';
import { TaskMeta } from '../components/TaskRow';
import { useStudy } from '../StudyContext';
import { PRIORITY_RANK, STATUSES } from '../utils/constants';

const DONE_LIMIT = 15;
const dueTime = (t) => (t.due_date ? new Date(t.due_date).getTime() : Infinity);

const BoardView = () => {
  const { data, ui } = useStudy();
  const { tasks } = data;
  const [dragId, setDragId] = useState(null);
  const [overColumn, setOverColumn] = useState(null);

  const columnTasks = (status) => {
    const list = tasks.filter((t) => t.status === status);
    if (status === 'completed') {
      return list.sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));
    }
    return list.sort((a, b) => dueTime(a) - dueTime(b) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
  };

  const drop = (status) => {
    const task = tasks.find((t) => t.id === dragId);
    if (task && task.status !== status) data.setStatus(task.id, status);
    setDragId(null);
    setOverColumn(null);
  };

  return (
    <div className="view view-wide">
      <header className="page-head">
        <div>
          <h1>Board</h1>
          <p className="page-sub">Drag a card to change its status, or use the arrows.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => ui.openCreate()}>
          <Icon name="plus" size={16} /> New task
        </button>
      </header>

      <div className="board">
        {STATUSES.map((col, index) => {
          const all = columnTasks(col.value);
          const shown = col.value === 'completed' ? all.slice(0, DONE_LIMIT) : all;
          return (
            <section
              key={col.value}
              className={`column ${overColumn === col.value ? 'is-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setOverColumn(col.value); }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOverColumn(null); }}
              onDrop={(e) => { e.preventDefault(); drop(col.value); }}
            >
              <h2 className="column-head">
                {col.label} <span className="count">{all.length}</span>
              </h2>
              <div className="column-body">
                {shown.map((t) => (
                  <article
                    key={t.id}
                    className={`board-card ${dragId === t.id ? 'is-dragging' : ''} ${t.status === 'completed' ? 'is-done' : ''}`}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', String(t.id));
                      setDragId(t.id);
                    }}
                    onDragEnd={() => { setDragId(null); setOverColumn(null); }}
                  >
                    <button type="button" className="board-card-main" onClick={() => ui.openTask(t.id)}>
                      <span className="task-title">{t.title}</span>
                      <TaskMeta task={t} />
                    </button>
                    <div className="board-card-move">
                      <button
                        type="button"
                        className="icon-btn"
                        disabled={index === 0}
                        aria-label={`Move ${t.title} to ${STATUSES[index - 1]?.label || ''}`}
                        title={index > 0 ? `Move to ${STATUSES[index - 1].label}` : undefined}
                        onClick={() => data.setStatus(t.id, STATUSES[index - 1].value)}
                      >
                        <Icon name="chevron-left" size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        disabled={index === STATUSES.length - 1}
                        aria-label={`Move ${t.title} to ${STATUSES[index + 1]?.label || ''}`}
                        title={index < STATUSES.length - 1 ? `Move to ${STATUSES[index + 1].label}` : undefined}
                        onClick={() => data.setStatus(t.id, STATUSES[index + 1].value)}
                      >
                        <Icon name="chevron-right" size={15} />
                      </button>
                    </div>
                  </article>
                ))}
                {all.length === 0 && <p className="column-empty">Nothing here</p>}
                {all.length > shown.length && (
                  <button type="button" className="btn btn-quiet btn-sm btn-block" onClick={() => ui.setView('tasks')}>
                    {all.length - shown.length} more in Tasks
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default BoardView;
