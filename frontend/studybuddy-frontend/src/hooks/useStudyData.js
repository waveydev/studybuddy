import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import api, { API_BASE } from '../api';

const UNDO_WINDOW_MS = 5000;

/**
 * Owns tasks, courses and study sessions, and every call that changes them.
 * Updates are optimistic: the UI changes first and rolls back if the server refuses.
 */
export default function useStudyData() {
  const [tasks, setTasks] = useState([]);
  const [courses, setCourses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  // Deletes wait out the undo window here: id -> timeout handle.
  const pendingDeletes = useRef(new Map());

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [t, c, s] = await Promise.all([
        api.get('/tasks/'), api.get('/courses/'), api.get('/sessions/'),
      ]);
      setTasks(t.data);
      setCourses(c.data);
      setSessions(s.data);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // If the tab closes inside the undo window, send the deletes anyway.
  useEffect(() => {
    const flush = () => {
      pendingDeletes.current.forEach((handle, id) => {
        clearTimeout(handle);
        fetch(`${API_BASE}/api/tasks/${id}/`, { method: 'DELETE', keepalive: true }).catch(() => {});
      });
      pendingDeletes.current.clear();
    };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);

  const patchLocal = (id, fn) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? fn(t) : t)));

  const createTask = async (data, subtaskTitles = []) => {
    try {
      const res = await api.post('/tasks/', data);
      const task = res.data;
      const subtasks = [];
      for (const title of subtaskTitles) {
        const sub = await api.post(`/tasks/${task.id}/subtasks/`, { title });
        subtasks.push(sub.data);
      }
      setTasks((prev) => [{ ...task, subtasks }, ...prev]);
      toast.success('Task added');
      return task;
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Could not add the task. Is the server running?');
      return null;
    }
  };

  const updateTask = async (id, patch) => {
    const before = tasksRef.current.find((t) => t.id === id);
    if (!before) return false;
    patchLocal(id, (t) => ({
      ...t,
      ...patch,
      ...(patch.status
        ? { completed_at: patch.status === 'completed' ? (t.completed_at || new Date().toISOString()) : null }
        : {}),
    }));
    try {
      const res = await api.patch(`/tasks/${id}/`, patch);
      patchLocal(id, () => res.data);
      return true;
    } catch (error) {
      console.error('Error updating task:', error);
      patchLocal(id, () => before);
      toast.error('Could not save the change');
      return false;
    }
  };

  const setStatus = async (id, status) => {
    const ok = await updateTask(id, { status });
    if (ok && status === 'completed') toast.success('Done. Nice work!');
  };

  const deleteTask = (id) => {
    const task = tasksRef.current.find((t) => t.id === id);
    if (!task) return;
    setTasks((prev) => prev.filter((t) => t.id !== id));

    const handle = setTimeout(async () => {
      pendingDeletes.current.delete(id);
      try {
        await api.delete(`/tasks/${id}/`);
      } catch (error) {
        console.error('Error deleting task:', error);
        setTasks((prev) => [task, ...prev]);
        toast.error('Could not delete the task');
      }
    }, UNDO_WINDOW_MS);
    pendingDeletes.current.set(id, handle);

    toast(
      (t) => (
        <span className="toast-undo">
          Task deleted
          <button
            type="button"
            onClick={() => {
              clearTimeout(pendingDeletes.current.get(id));
              pendingDeletes.current.delete(id);
              setTasks((prev) => (prev.some((x) => x.id === id) ? prev : [task, ...prev]));
              toast.dismiss(t.id);
            }}
          >
            Undo
          </button>
        </span>
      ),
      { duration: UNDO_WINDOW_MS },
    );
  };

  const addSubtask = async (taskId, title) => {
    try {
      const res = await api.post(`/tasks/${taskId}/subtasks/`, { title });
      patchLocal(taskId, (t) => ({ ...t, subtasks: [...(t.subtasks || []), res.data] }));
    } catch (error) {
      console.error('Error adding step:', error);
      toast.error('Could not add the step');
    }
  };

  const toggleSubtask = async (taskId, subtask) => {
    const setDone = (done) =>
      patchLocal(taskId, (t) => ({
        ...t,
        subtasks: t.subtasks.map((s) => (s.id === subtask.id ? { ...s, done } : s)),
      }));
    setDone(!subtask.done);
    try {
      await api.patch(`/subtasks/${subtask.id}/`, { done: !subtask.done });
    } catch (error) {
      console.error('Error updating step:', error);
      setDone(subtask.done);
      toast.error('Could not save the change');
    }
  };

  const deleteSubtask = async (taskId, subtaskId) => {
    try {
      await api.delete(`/subtasks/${subtaskId}/`);
      patchLocal(taskId, (t) => ({ ...t, subtasks: t.subtasks.filter((s) => s.id !== subtaskId) }));
    } catch (error) {
      console.error('Error deleting step:', error);
      toast.error('Could not remove the step');
    }
  };

  const createCourse = async (data) => {
    try {
      const res = await api.post('/courses/', data);
      setCourses((prev) => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success('Course added');
      return res.data;
    } catch (error) {
      console.error('Error creating course:', error);
      toast.error('Could not add the course');
      return null;
    }
  };

  const updateCourse = async (id, data) => {
    try {
      const res = await api.patch(`/courses/${id}/`, data);
      setCourses((prev) => prev.map((c) => (c.id === id ? res.data : c)));
      return true;
    } catch (error) {
      console.error('Error updating course:', error);
      toast.error('Could not save the course');
      return false;
    }
  };

  const deleteCourse = async (id) => {
    try {
      await api.delete(`/courses/${id}/`);
      setCourses((prev) => prev.filter((c) => c.id !== id));
      // The server keeps the tasks and just detaches them.
      setTasks((prev) => prev.map((t) => (t.course === id ? { ...t, course: null } : t)));
      setSessions((prev) => prev.map((s) => (s.course === id ? { ...s, course: null } : s)));
      toast.success('Course deleted. Its tasks were kept.');
    } catch (error) {
      console.error('Error deleting course:', error);
      toast.error('Could not delete the course');
    }
  };

  const logSession = async ({ taskId, minutes, startedAt }) => {
    try {
      const res = await api.post('/sessions/', {
        task: taskId || null,
        minutes,
        started_at: new Date(startedAt || Date.now()).toISOString(),
      });
      setSessions((prev) => [res.data, ...prev]);
      if (taskId) {
        patchLocal(taskId, (t) => ({ ...t, focus_minutes: (t.focus_minutes || 0) + minutes }));
      }
      return true;
    } catch (error) {
      console.error('Error logging session:', error);
      toast.error('Could not log the focus session');
      return false;
    }
  };

  return {
    tasks, courses, sessions, loading, loadError, reload: load,
    createTask, updateTask, setStatus, deleteTask,
    addSubtask, toggleSubtask, deleteSubtask,
    createCourse, updateCourse, deleteCourse,
    logSession,
  };
}
