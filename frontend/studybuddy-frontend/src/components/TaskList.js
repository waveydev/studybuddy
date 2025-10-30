import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../styles/modern.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';

// Card animation variants for enter/exit and layout transitions
const cardVariants = {
  initial: { opacity: 0, y: -10, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 420, damping: 30, mass: 0.7 }
  },
  exit: { opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.15 } }
};

// Section/page-level transitions
const sectionVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28 } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2 } }
};

const TaskList = () => {
  // Mode persisted in localStorage
  const initialMode = (() => {
    try {
      const m = localStorage.getItem('mode');
      return ['home','create','view'].includes(m) ? m : 'home';
    } catch { return 'home'; }
  })();
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [mode, setMode] = useState(initialMode); // 'home' | 'create' | 'view'
  // Search state with debounce
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: 'other',
    due_date: ''
  });
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: 'other',
    due_date: ''
  });
  // Track last completed task for a one-time celebration animation
  const [lastCompletedId, setLastCompletedId] = useState(null);

  // Clock for urgency visuals to update naturally (once per minute)
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, []);
  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [search]);
  // Persist mode
  useEffect(() => {
    try { localStorage.setItem('mode', mode); } catch {}
  }, [mode]);
  const handleSetMode = (m) => setMode(m);
  const handleSetFilter = (key) => {
    setFilter(key);
    // Use native smooth scroll so user input isn't blocked
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      window.scrollTo(0, 0);
    }
  };


  // Compute filtered tasks based on current tasks, filter, and debouncedSearch
  const filterTasks = useCallback(() => {
    let filtered = tasks;
    switch (filter) {
      case 'pending':
        filtered = tasks.filter(task => task.status === 'pending');
        break;
      case 'in_progress':
        filtered = tasks.filter(task => task.status === 'in_progress');
        break;
      case 'completed':
        filtered = tasks.filter(task => task.status === 'completed');
        break;
      case 'overdue':
        filtered = tasks.filter(task => task.is_overdue);
        break;
      case 'high_priority':
        filtered = tasks.filter(task => task.priority === 'high');
        break;
      default:
        filtered = tasks;
    }
    // Apply debounced search across title, description, category, and status
    if (debouncedSearch) {
      const q = debouncedSearch;
      filtered = filtered.filter((task) => {
        const title = (task.title || '').toLowerCase();
        const desc = (task.description || '').toLowerCase();
        const cat = (task.category || '').toLowerCase();
        const status = (task.status || '').toLowerCase();
        return (
          title.includes(q) ||
          desc.includes(q) ||
          cat.includes(q) ||
          status.includes(q)
        );
      });
    }
    setFilteredTasks(filtered);
  }, [tasks, filter, debouncedSearch]);


  // Recompute filtered tasks when dependencies change
  useEffect(() => {
    filterTasks();
  }, [filterTasks]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/tasks/');
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  // Helpers for datetime-local value formatting and ISO conversion
  const toDatetimeLocal = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const pad = (n) => String(n).padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const toIsoOrNull = (datetimeLocal) => {
    return datetimeLocal ? new Date(datetimeLocal).toISOString() : null;
  };

  // Quick date helpers
  const getDatetimeLocalForOffset = (daysOffset, hour = 17, minute = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    date.setHours(hour, minute, 0, 0);
    return toDatetimeLocal(date.toISOString());
  };

  const setQuickDate = (daysOffset, isEdit = false) => {
    const value = getDatetimeLocalForOffset(daysOffset);
    if (isEdit) {
      setEditForm(prev => ({ ...prev, due_date: value }));
    } else {
      setNewTask(prev => ({ ...prev, due_date: value }));
    }
  };

  const createTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    // Optimistic insert for instant feedback
    const tempId = `temp-${Date.now()}`;
    const optimisticTask = {
      id: tempId,
      title: newTask.title,
      description: newTask.description,
      priority: newTask.priority,
      category: newTask.category,
      status: 'pending',
      due_date: newTask.due_date ? new Date(newTask.due_date).toISOString() : null,
      is_overdue: false,
      days_until_due: null,
      _optimistic: true,
    };
    setTasks(prev => [optimisticTask, ...prev]);

    // Clear form quickly for snappy UX; keep button state responsive
    setNewTask({ title: '', description: '', priority: 'medium', category: 'other', due_date: '' });

    try {
      const taskData = {
        title: optimisticTask.title,
        description: optimisticTask.description,
        priority: optimisticTask.priority,
        category: optimisticTask.category,
        due_date: optimisticTask.due_date || null,
      };
      const res = await axios.post('http://127.0.0.1:8000/api/tasks/', taskData);
      const created = res.data;
      // Replace temp with server result (includes computed fields)
      setTasks(prev => prev.map(t => (t.id === tempId ? created : t)));
      toast.success('Task created');
    } catch (error) {
      console.error('Error creating task:', error);
      // Roll back optimistic card if the request failed
      setTasks(prev => prev.filter(t => t.id !== tempId));
      toast.error('Failed to create task');
    }
  };

  // Editing: start, cancel, change handlers, and save
  const startEdit = (task) => {
    setEditingTaskId(task.id);
    setEditForm({
      title: task.title || '',
      description: task.description || '',
      priority: task.priority || 'medium',
      category: task.category || 'other',
      due_date: toDatetimeLocal(task.due_date)
    });
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setEditForm({ title: '', description: '', priority: 'medium', category: 'other', due_date: '' });
  };

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveEdit = async (taskId) => {
    if (!editForm.title.trim()) return;
    setSavingEdit(true);
    try {
      const payload = {
        title: editForm.title,
        description: editForm.description,
        priority: editForm.priority,
        category: editForm.category,
        due_date: toIsoOrNull(editForm.due_date)
      };
      await axios.patch(`http://127.0.0.1:8000/api/tasks/${taskId}/`, payload);
      setEditingTaskId(null);
      await fetchTasks();
      toast.success('Task updated');
    } catch (error) {
      console.error('Error saving task edits:', error);
      toast.error('Failed to update task');
    } finally {
      setSavingEdit(false);
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      await axios.patch(`http://127.0.0.1:8000/api/tasks/${taskId}/`, { status: newStatus });
      if (newStatus === 'completed') {
        setLastCompletedId(taskId);
        // Clear highlight after a short moment
        setTimeout(() => setLastCompletedId(null), 1800);
      }
      fetchTasks();
      const msg =
        newStatus === 'completed' ? 'Marked as completed' :
        newStatus === 'in_progress' ? 'Moved to In Progress' :
        newStatus === 'pending' ? 'Reopened task' : 'Status updated';
      toast.success(msg);
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update status');
    }
  };

  const deleteTask = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await axios.delete(`http://127.0.0.1:8000/api/tasks/${taskId}/`);
        fetchTasks();
        toast.success('Task deleted');
      } catch (error) {
        console.error('Error deleting task:', error);
        toast.error('Failed to delete task');
      }
    }
  };

  // Urgency helpers
  const getUrgency = (task) => {
    if (task.status === 'completed') return 'none';
    if (task.is_overdue) return 'overdue';
    if (task.days_until_due !== null && task.days_until_due <= 7) return 'due-soon';
    return 'none';
  };

  // Compute progress from created_at -> due_date; may exceed 1 if overdue
  const computeTimeProgress = (task) => {
    if (!task?.due_date || task.status === 'completed' || !task?.created_at) return null;
    const start = new Date(task.created_at).getTime();
    const end = new Date(task.due_date).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
    const ratio = (now - start) / (end - start);
    return ratio;
  };

  

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDueDateClass = (task) => {
    // For completed tasks, don't highlight overdue/soon
    if (task.status === 'completed') return '';
    if (task.is_overdue) return 'overdue';
    if (task.days_until_due !== null && task.days_until_due <= 7) return 'due-soon';
    return '';
  };

  const getTaskCardClass = (task) => {
    let classes = 'task-card fade-in';
    // Completed tasks get a celebratory style
    if (task.status === 'completed') return classes + ' completed';
    if (task.is_overdue) classes += ' overdue';
    else if (task.days_until_due !== null && task.days_until_due <= 7) classes += ' due-soon';
    return classes;
  };

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    overdue: tasks.filter(t => t.is_overdue).length
  };

  // Empty-state helper to provide contextual messages per filter
  const getEmptyStateContent = () => {
    const hasAnyTasks = tasks.length > 0;
    const map = {
      all: hasAnyTasks
        ? { icon: '📝', title: 'No tasks found', subtitle: '' }
        : { icon: '📝', title: 'No tasks yet', subtitle: 'Create your first task to get started with StudyBuddy!' },
      pending: { icon: '⏸️', title: 'No pending tasks', subtitle: hasAnyTasks ? 'Nothing to do here right now.' : 'Create your first task to get started with StudyBuddy!' },
      in_progress: { icon: '⏳', title: 'No in-progress tasks', subtitle: hasAnyTasks ? 'Move a task to In Progress to see it here.' : 'Create your first task to get started with StudyBuddy!' },
      completed: { icon: '✅', title: 'No completed tasks', subtitle: hasAnyTasks ? 'Complete a task to list it here.' : 'Create your first task to get started with StudyBuddy!' },
      overdue: { icon: '🚨', title: 'No overdue tasks', subtitle: hasAnyTasks ? 'Great job — nothing overdue!' : 'Create your first task to get started with StudyBuddy!' },
      high_priority: { icon: '🔴', title: 'No high-priority tasks', subtitle: hasAnyTasks ? 'Mark a task as High to see it here.' : 'Create your first task to get started with StudyBuddy!' },
    };
    return map[filter] || map.all;
  };

  return (
    <div className="modern-container">
      <Toaster position="top-right"
        toastOptions={{
          style: { background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' },
          success: { iconTheme: { primary: '#10b981', secondary: '#ffffff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#ffffff' } }
        }}
      />
      {/* Header */}
      <div className="app-header">
        <div className="container">
          <h1 className="app-title">📚 StudyBuddy</h1>
          <p className="app-subtitle">Your intelligent task management companion</p>
        </div>
      </div>

      <div className="container">
        {/* Mode Switch Buttons */}
        <div className="text-center mb-4" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className={`btn btn-modern ${mode === 'view' ? 'btn-primary-modern' : 'btn-info-modern'}`} onClick={() => handleSetMode('view')}>📋 View my tasks</button>
          <button className={`btn btn-modern ${mode === 'create' ? 'btn-primary-modern' : 'btn-success-modern'}`} onClick={() => handleSetMode('create')}>✏️ Create a task</button>
          <button className={`btn btn-modern btn-outline-modern`} onClick={() => handleSetMode('home')}>🏠 Home</button>
        </div>

        {/* Sections */}
        <AnimatePresence mode="wait">
          {mode === 'home' && (
            <motion.div key="home" className="home-section" variants={sectionVariants} initial="initial" animate="animate" exit="exit">
              <div className="row g-4">
                <div className="col-md-6">
                  <div className="modern-card home-choice-card soft-pulse" style={{ height: '100%' }}>
                    <div className="card-header-modern"><h3 className="mb-0">📋 View your tasks</h3></div>
                    <div className="p-4">
                      <p>Browse your tasks by status, urgency, and due date. Use filters to focus on what matters.</p>
  
                      <button className="btn btn-primary-modern btn-modern" onClick={() => handleSetMode('view')}>Open task dashboard →</button>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="modern-card home-choice-card soft-pulse" style={{ height: '100%' }}>
                    <div className="card-header-modern"><h3 className="mb-0">✏️ Create a task</h3></div>
                    <div className="p-4">
                      <p>Capture new work with title, description, priority, category and an optional due date.</p>
                      <button className="btn btn-success-modern btn-modern" onClick={() => handleSetMode('create')}>✏️ Start a new task →</button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {mode === 'create' && (
            <motion.div key="create" variants={sectionVariants} initial="initial" animate="animate" exit="exit">
              <div className="row mb-4">
                <div className="col-12">
                  <div className="modern-card create-card" style={{ height: '100%' }}>
                    <div className="card-header-modern">
                      <h3 className="mb-0">✏️ Create New Task</h3>
                    </div>
                    <div className="card-body p-4">
                      <form onSubmit={createTask}>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <input
                              type="text"
                              className="form-control form-control-modern"
                              placeholder="Enter task title *"
                              value={newTask.title} 
                              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                              required
                            />
                          </div>
                          <div className="col-md-6">
                            <input
                              type="text"
                              className="form-control form-control-modern"
                              placeholder="Task description (optional)"
                              value={newTask.description}
                              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                            />
                          </div>
                          <div className="col-md-3">
                            <select
                              className="form-control form-control-modern"
                              value={newTask.priority}
                              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                            >
                              <option value="low">🟢 Low Priority</option>
                              <option value="medium">🟡 Medium Priority</option>
                              <option value="high">🔴 High Priority</option>
                            </select>
                          </div>
                          <div className="col-md-3">
                            <select
                              className="form-control form-control-modern"
                              value={newTask.category}
                              onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                            >
                              <option value="assignment">📝 Assignment</option>
                              <option value="exam">📚 Exam</option>
                              <option value="project">💼 Project</option>
                              <option value="reading">📖 Reading</option>
                              <option value="other">📌 Other</option>
                            </select>
                          </div>
                          <div className="col-md-6">
                            <div className="quick-date-buttons mb-2">
                              <button type="button" className="btn-quick-date" onClick={() => setQuickDate(1)}>Tomorrow</button>
                              <button type="button" className="btn-quick-date" onClick={() => setQuickDate(3)}>In 3 days</button>
                              <button type="button" className="btn-quick-date" onClick={() => setQuickDate(7)}>Next week</button>
                            </div>
                            <input
                              type="datetime-local"
                              className="form-control form-control-modern"
                              value={newTask.due_date}
                              onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                            />
                          </div>
                          <div className="col-md-12">
                            <button 
                              type="submit" 
                              className="btn btn-primary-modern btn-modern"
                              disabled={loading}
                            >
                              {loading ? <span className="loading-spinner"></span> : '➕'}
                              Add Task
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {mode === 'view' && (
            <motion.div key="view" variants={sectionVariants} initial="initial" animate="animate" exit="exit">
              {/* Statistics Cards */}
              <div className="row mb-4">
                {loading ? (
                  [0,1,2,3].map((i) => (
                    <div key={i} className="col-md-3 col-sm-6">
                      <div className="stats-card skeleton">
                        <div className="skeleton-circle" style={{ margin: '0 auto 10px', width: 36, height: 36 }}></div>
                        <div className="skeleton-line w-50" style={{ margin: '8px auto' }}></div>
                        <div className="skeleton-line w-25" style={{ margin: '8px auto 0' }}></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="col-md-3 col-sm-6">
                      <div className="stats-card">
                        <span className="stats-icon">📋</span>
                        <h2 className="stats-number">{stats.total}</h2>
                        <p className="stats-label">Total Tasks</p>
                      </div>
                    </div>
                    <div className="col-md-3 col-sm-6">
                      <div className="stats-card">
                        <span className="stats-icon">✅</span>
                        <h2 className="stats-number">{stats.completed}</h2>
                        <p className="stats-label">Completed</p>
                      </div>
                    </div>
                    <div className="col-md-3 col-sm-6">
                      <div className="stats-card">
                        <span className="stats-icon">⏳</span>
                        <h2 className="stats-number">{stats.inProgress}</h2>
                        <p className="stats-label">In Progress</p>
                      </div>
                    </div>
                    <div className="col-md-3 col-sm-6">
                      <div className="stats-card">
                        <span className="stats-icon">🚨</span>
                        <h2 className="stats-number">{stats.overdue}</h2>
                        <p className="stats-label">Overdue</p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Search */}
              <div className="row mb-3">
                <div className="col-12">
                  <input
                    type="text"
                    className="form-control form-control-modern"
                    placeholder="Search tasks by title, description, category, or status…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Filter Buttons */}
              <div className="filter-buttons">
                {[
                  { key: 'all', label: '📋 All Tasks', count: stats.total },
                  { key: 'pending', label: '⏸️ Pending', count: tasks.filter(t => t.status === 'pending').length },
                  { key: 'in_progress', label: '⏳ In Progress', count: stats.inProgress },
                  { key: 'completed', label: '✅ Completed', count: stats.completed },
                  { key: 'overdue', label: '🚨 Overdue', count: stats.overdue },
                  { key: 'high_priority', label: '🔴 High Priority', count: tasks.filter(t => t.priority === 'high').length }
                ].map(filterOption => (
                  <button
                    key={filterOption.key}
                    className={`filter-btn ${filter === filterOption.key ? 'active' : ''}`}
                    onClick={() => handleSetFilter(filterOption.key)}
                  >
                    {filterOption.label} ({filterOption.count})
                  </button>
                ))}
              </div>

              {/* Task List */}
              <motion.div layout className="row">
                {loading && filteredTasks.length === 0 ? (
                  Array.from({ length: 6 }).map((_, idx) => (
                    <div key={idx} className="col-lg-4 col-md-6 mb-4">
                      <div className="task-card skeleton">
                        <div className="card-body p-3">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <div className="skeleton-line w-25" style={{ height: 18 }}></div>
                            <div className="skeleton-line w-20" style={{ height: 18 }}></div>
                          </div>
                          <div className="skeleton-line w-75" style={{ height: 18, marginBottom: 8 }}></div>
                          <div className="skeleton-line w-100"></div>
                          <div className="skeleton-line w-90"></div>
                          <div className="skeleton-line w-40"></div>
                        </div>
                        <div className="task-actions">
                          <div className="skeleton-line w-25" style={{ height: 28 }}></div>
                          <div className="skeleton-line w-25" style={{ height: 28 }}></div>
                          <div className="skeleton-line w-25" style={{ height: 28 }}></div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : filteredTasks.length === 0 ? (
                  <div className="col-12">
                    <div className="empty-state">
                      {(() => {
                        const { icon, title, subtitle } = getEmptyStateContent();
                        return (
                          <>
                            <div className="empty-state-icon">{icon}</div>
                            <h4>{title}</h4>
                            {subtitle ? <p>{subtitle}</p> : null}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {filteredTasks.map(task => {
                      const urgency = getUrgency(task);
                      const progress = computeTimeProgress(task);
                      const widthPct = progress != null
                        ? Math.max(0, Math.min(100, Math.round(progress * 100)))
                        : null;
                      const attentionLabel =
                        urgency === 'overdue'
                          ? `Overdue${task.days_until_due != null ? ` by ${Math.abs(task.days_until_due)} ${Math.abs(task.days_until_due) === 1 ? 'day' : 'days'}` : ''}`
                          : urgency === 'due-soon'
                          ? `Due in ${task.days_until_due ?? 0} ${task.days_until_due === 1 ? 'day' : 'days'}`
                          : null;
                      return (
                      <motion.div
                        key={task.id}
                        layout
                        variants={cardVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="col-lg-4 col-md-6 mb-4"
                      >
                        <motion.div
                          layout
                          initial={task._optimistic ? { boxShadow: '0 0 0 rgba(76,175,80,0)' } : undefined}
                          animate={
                            task._optimistic
                              ? { boxShadow: ['0 0 0 rgba(76,175,80,0)', '0 0 16px rgba(76,175,80,0.45)', '0 0 0 rgba(76,175,80,0)'] }
                              : undefined
                          }
                          transition={task._optimistic ? { duration: 0.9 } : undefined}
                          className={`${getTaskCardClass(task)} ${task.status === 'completed' && lastCompletedId === task.id ? 'celebrate' : ''}`}
                        >
                        {/* Success bar for completed tasks */}
                        {task.status === 'completed' && (
                          <>
                            <div className="success-bar" aria-hidden="true"></div>
                            {/* Right-middle emerald check overlay */}
                            <div
                              className="completion-check"
                              role="status"
                              aria-label="Task completed"
                              title="Task completed"
                            >
                              ✓
                            </div>
                          </>
                        )}
                        {/* Urgency progress bar (top) */}
                        {progress != null && (
                          <div className="urgency-bar" aria-hidden="true">
                            <motion.div
                              className={`fill ${urgency === 'overdue' ? 'danger' : urgency === 'due-soon' ? 'warning' : ''}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${widthPct}%` }}
                              transition={{ type: 'spring', stiffness: 200, damping: 30, mass: 0.7 }}
                            />
                          </div>
                        )}

                        <div className="card-body p-3">
                          {editingTaskId === task.id ? (
                            // Edit mode: show inline form
                            <div className="edit-form">
                              <div className="row g-2">
                                <div className="col-12">
                                  <input
                                    type="text"
                                    className="form-control form-control-modern"
                                    placeholder="Task title *"
                                    value={editForm.title}
                                    onChange={(e) => handleEditChange('title', e.target.value)}
                                    required
                                  />
                                </div>
                                <div className="col-12">
                                  <input
                                    type="text"
                                    className="form-control form-control-modern"
                                    placeholder="Description"
                                    value={editForm.description}
                                    onChange={(e) => handleEditChange('description', e.target.value)}
                                  />
                                </div>
                                <div className="col-6">
                                  <select
                                    className="form-control form-control-modern"
                                    value={editForm.priority}
                                    onChange={(e) => handleEditChange('priority', e.target.value)}
                                  >
                                    <option value="low">🟢 Low</option>
                                    <option value="medium">🟡 Medium</option>
                                    <option value="high">🔴 High</option>
                                  </select>
                                </div>
                                <div className="col-6">
                                  <select
                                    className="form-control form-control-modern"
                                    value={editForm.category}
                                    onChange={(e) => handleEditChange('category', e.target.value)}
                                  >
                                    <option value="assignment">📝 Assignment</option>
                                    <option value="exam">📚 Exam</option>
                                    <option value="project">💼 Project</option>
                                    <option value="reading">📖 Reading</option>
                                    <option value="other">📌 Other</option>
                                  </select>
                                </div>
                                <div className="col-12">
                                  <div className="quick-date-buttons mb-2">
                                    <button type="button" className="btn-quick-date" onClick={() => setQuickDate(1, true)}>Tomorrow</button>
                                    <button type="button" className="btn-quick-date" onClick={() => setQuickDate(3, true)}>In 3 days</button>
                                    <button type="button" className="btn-quick-date" onClick={() => setQuickDate(7, true)}>Next week</button>
                                  </div>
                                  <input
                                    type="datetime-local"
                                    className="form-control form-control-modern"
                                    value={editForm.due_date}
                                    onChange={(e) => handleEditChange('due_date', e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            // View mode
                            <>
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <div className="d-flex align-items-center" style={{ gap: '8px' }}>
                                  <span className={`priority-badge priority-${task.priority}`}>
                                    {task.priority}
                                  </span>
                                  {task.status !== 'completed' && urgency !== 'none' ? (
                                    <span
                                      className={`urgency-chip ${urgency === 'overdue' ? 'danger' : 'warning'}`}
                                      role="status"
                                      aria-label={attentionLabel || undefined}
                                      title={attentionLabel || undefined}
                                    >
                                      {urgency === 'overdue' ? 'Overdue' : 'Due soon'}
                                    </span>
                                  ) : null}
                                </div>
                                <span className="category-badge">
                                  {task.category}
                                </span>
                              </div>
                              
                              <h5 className="card-title mb-2">
                                {urgency !== 'none' && (
                                  <span className={`pulse-dot ${urgency === 'overdue' ? 'danger' : 'warning'}`} aria-hidden="true" />
                                )}
                                {task.title}
                              </h5>
                              <p className="card-text text-muted mb-3">
                                {task.description || 'No description provided'}
                              </p>
                              
                              <div className={`due-date-info ${getDueDateClass(task)}`}>
                                <span>📅</span>
                                <span>{formatDate(task.due_date)}</span>
                              </div>
                              
                              {task.status !== 'completed' && task.days_until_due !== null && (
                                <div className={`due-date-info ${getDueDateClass(task)}`}>
                                  <span>⏰</span>
                                  <span>
                                    {task.days_until_due < 0 
                                      ? `${Math.abs(task.days_until_due)} days overdue!`
                                      : task.days_until_due === 0 
                                      ? 'Due today!'
                                      : `${task.days_until_due} days remaining`
                                    }
                                  </span>
                                </div>
                              )}

                              <div className="mt-3">
                                <span className={`status-badge status-${task.status}`}>
                                  {task.status === 'in_progress' ? 'In Progress' : task.status}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                        
                        <div className="task-actions">
                          {editingTaskId === task.id ? (
                            <>
                              <button
                                className="btn btn-success-modern btn-modern"
                                disabled={savingEdit}
                                onClick={() => saveEdit(task.id)}
                              >
                                {savingEdit ? 'Saving…' : '💾 Save'}
                              </button>
                              <button
                                className="btn btn-warning-modern btn-modern"
                                onClick={cancelEdit}
                              >
                                ✖️ Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="btn btn-secondary btn-modern"
                                onClick={() => startEdit(task)}
                              >
                                ✏️ Edit
                              </button>
                              {task.status !== 'completed' && (
                                <>
                                  <button
                                    className="btn btn-info-modern btn-modern"
                                    onClick={() => updateTaskStatus(task.id, 'in_progress')}
                                  >
                                    ⏳ Progress
                                  </button>
                                  <button
                                    className="btn btn-success-modern btn-modern"
                                    onClick={() => updateTaskStatus(task.id, 'completed')}
                                  >
                                    ✅ Complete
                                  </button>
                                </>
                              )}
                              {task.status === 'completed' && (
                                <button
                                  className="btn btn-warning-modern btn-modern"
                                  onClick={() => updateTaskStatus(task.id, 'pending')}
                                >
                                  🔄 Reopen
                                </button>
                              )}
                              <button
                                className="btn btn-danger-modern btn-modern"
                                onClick={() => deleteTask(task.id)}
                              >
                                🗑️ Delete
                              </button>
                            </>
                          )}
                        </div>
                        </motion.div>
                      </motion.div>
                    );})}
                  </AnimatePresence>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TaskList;