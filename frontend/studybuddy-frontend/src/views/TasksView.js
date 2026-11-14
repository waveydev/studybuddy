import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon';
import TaskRow from '../components/TaskRow';
import { useStudy } from '../StudyContext';
import { BUCKETS, dueInfo } from '../utils/dates';
import { CATEGORIES, PRIORITY_RANK } from '../utils/constants';

const SCOPES = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Done' },
  { value: 'all', label: 'All' },
];

const dueTime = (t) => (t.due_date ? new Date(t.due_date).getTime() : Infinity);

const SORTS = {
  due: (a, b) => dueTime(a) - dueTime(b) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
  priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || dueTime(a) - dueTime(b),
  newest: (a, b) => new Date(b.created_at) - new Date(a.created_at),
};

const TasksView = () => {
  const { data, now, ui } = useStudy();
  const { tasks, courses, loading } = data;
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState('active');
  const [course, setCourse] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('due');
  const searchRef = useRef(null);

  // "/" jumps to search, like most task apps.
  useEffect(() => {
    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const counts = {
    active: tasks.filter((t) => t.status !== 'completed').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    all: tasks.length,
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = tasks.filter((t) => {
      if (scope === 'active' && t.status === 'completed') return false;
      if (scope === 'completed' && t.status !== 'completed') return false;
      if (course === 'none' ? t.course !== null : course && t.course !== Number(course)) return false;
      if (category && t.category !== category) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.subtasks || []).some((s) => s.title.toLowerCase().includes(q))
      );
    });
    if (scope === 'completed') {
      return list.sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));
    }
    return list.sort(SORTS[sort]);
  }, [tasks, search, scope, course, category, sort]);

  // Group by due date only when that is also the sort order.
  const grouped = scope !== 'completed' && sort === 'due';
  const groups = grouped
    ? BUCKETS.map((b) => ({
        ...b,
        tasks: visible.filter((t) => dueInfo(t, now).bucket === b.key),
      })).filter((g) => g.tasks.length > 0)
    : [{ key: 'flat', label: null, tasks: visible }];

  const filtering = Boolean(search.trim() || course || category);
  const clearFilters = () => { setSearch(''); setCourse(''); setCategory(''); };

  return (
    <div className="view">
      <header className="page-head">
        <div>
          <h1>Tasks</h1>
          <p className="page-sub">{counts.active} active · {counts.completed} done</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => ui.openCreate()}>
          <Icon name="plus" size={16} /> New task
        </button>
      </header>

      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={16} />
          <input
            ref={searchRef}
            type="search"
            placeholder="Search tasks and steps"
            aria-label="Search tasks"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <kbd>/</kbd>
        </div>
        <div className="segmented" role="radiogroup" aria-label="Show">
          {SCOPES.map((s) => (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={scope === s.value}
              className={scope === s.value ? 'is-active' : ''}
              onClick={() => setScope(s.value)}
            >
              {s.label} <span className="count">{counts[s.value]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar toolbar-filters">
        <select className="input input-sm" aria-label="Course" value={course} onChange={(e) => setCourse(e.target.value)}>
          <option value="">All courses</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          <option value="none">No course</option>
        </select>
        <select className="input input-sm" aria-label="Type" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All types</option>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        {scope !== 'completed' && (
          <select className="input input-sm" aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="due">Sort: due date</option>
            <option value="priority">Sort: priority</option>
            <option value="newest">Sort: newest</option>
          </select>
        )}
        {filtering && (
          <button type="button" className="btn btn-quiet btn-sm" onClick={clearFilters}>Clear filters</button>
        )}
      </div>

      <div className="card card-flush">
        {loading ? (
          <div className="skeleton-list">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton-row" />)}</div>
        ) : visible.length === 0 ? (
          <div className="empty">
            {filtering ? (
              <>
                <h3>No tasks match</h3>
                <p>Try a different search or clear the filters.</p>
                <button type="button" className="btn btn-quiet" onClick={clearFilters}>Clear filters</button>
              </>
            ) : scope === 'completed' ? (
              <>
                <h3>Nothing finished yet</h3>
                <p>Tick a task off and it will show up here.</p>
              </>
            ) : (
              <>
                <h3>{tasks.length ? 'All caught up' : 'No tasks yet'}</h3>
                <p>{tasks.length ? 'Every task is done. Add the next thing on your plate.' : 'Add your first assignment, exam or reading to get going.'}</p>
                <button type="button" className="btn btn-primary" onClick={() => ui.openCreate()}>
                  <Icon name="plus" size={16} /> Add a task
                </button>
              </>
            )}
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.key} className="plan-section">
              {g.label && (
                <h3 className={`group-title ${g.key === 'overdue' ? 'tone-overdue' : ''}`}>
                  {g.label} <span className="count">{g.tasks.length}</span>
                </h3>
              )}
              {g.tasks.map((t) => <TaskRow key={t.id} task={t} />)}
            </section>
          ))
        )}
      </div>
    </div>
  );
};

export default TasksView;
