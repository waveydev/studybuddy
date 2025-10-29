import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/modern.css';
import { motion, AnimatePresence } from 'framer-motion';

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

const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
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

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    filterTasks();
  }, [tasks, filter]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/tasks/');
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
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
    } catch (error) {
      console.error('Error creating task:', error);
      // Roll back optimistic card if the request failed
      setTasks(prev => prev.filter(t => t.id !== tempId));
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
    } catch (error) {
      console.error('Error saving task edits:', error);
    } finally {
      setSavingEdit(false);
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      await axios.patch(`http://127.0.0.1:8000/api/tasks/${taskId}/`, { status: newStatus });
      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const deleteTask = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await axios.delete(`http://127.0.0.1:8000/api/tasks/${taskId}/`);
        fetchTasks();
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const filterTasks = () => {
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
    setFilteredTasks(filtered);
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
    if (task.days_until_due !== null && task.days_until_due <= 3) return 'due-soon';
    return '';
  };

  const getTaskCardClass = (task) => {
    let classes = 'task-card fade-in';
    // For completed tasks, keep neutral styling
    if (task.status === 'completed') return classes;
    if (task.is_overdue) classes += ' overdue';
    else if (task.days_until_due !== null && task.days_until_due <= 3) classes += ' due-soon';
    return classes;
  };

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    overdue: tasks.filter(t => t.is_overdue).length
  };

  return (
    <div className="modern-container">
      {/* Header */}
      <div className="app-header">
        <div className="container">
          <h1 className="app-title">📚 StudyBuddy</h1>
          <p className="app-subtitle">Your intelligent task management companion</p>
        </div>
      </div>

      <div className="container">
        {/* Statistics Cards */}
        <div className="row mb-4">
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
        </div>

        {/* Add Task Form */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="modern-card">
              <div className="card-header-modern">
                <h3 className="mb-0">✨ Create New Task</h3>
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
                    <div className="col-md-3">
                      <input
                        type="datetime-local"
                        className="form-control form-control-modern"
                        value={newTask.due_date}
                        onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                      />
                    </div>
                    <div className="col-md-3">
                      <button 
                        type="submit" 
                        className="btn btn-primary-modern btn-modern w-100"
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
              onClick={() => setFilter(filterOption.key)}
            >
              {filterOption.label} ({filterOption.count})
            </button>
          ))}
        </div>

        {/* Task List */}
        <div className="row">
          {loading && filteredTasks.length === 0 ? (
            <div className="col-12">
              <div className="empty-state">
                <div className="loading-spinner" style={{ width: '40px', height: '40px' }}></div>
                <h4>Loading tasks...</h4>
              </div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="col-12">
              <div className="empty-state">
                <div className="empty-state-icon">📝</div>
                <h4>No tasks found</h4>
                <p>Create your first task to get started with StudyBuddy!</p>
              </div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {filteredTasks.map(task => (
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
                    className={getTaskCardClass(task)}
                  >
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
                          <span className={`priority-badge priority-${task.priority}`}>
                            {task.priority}
                          </span>
                          <span className="category-badge">
                            {task.category}
                          </span>
                        </div>
                        
                        <h5 className="card-title mb-2">{task.title}</h5>
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
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskList;