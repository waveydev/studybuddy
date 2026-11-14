import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Icon from './Icon';
import { useStudy } from '../StudyContext';
import { CATEGORIES, PRIORITIES, STATUSES } from '../utils/constants';
import { formatMinutes, quickDate, toDatetimeLocal, toIsoOrNull } from '../utils/dates';

const ESTIMATES = [15, 30, 60, 120];

const Segmented = ({ label, options, value, onChange }) => (
  <div className="segmented" role="radiogroup" aria-label={label}>
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        role="radio"
        aria-checked={value === o.value}
        className={value === o.value ? 'is-active' : ''}
        onClick={() => onChange(o.value)}
      >
        {o.label}
      </button>
    ))}
  </div>
);

/**
 * Create or edit a task.
 * `taskId` set -> edit that task (steps save immediately, the rest on Save).
 * otherwise   -> create, optionally pre-filled from `defaults`.
 */
const TaskModal = ({ taskId, defaults, onClose }) => {
  const { data, ui } = useStudy();
  const task = taskId ? data.tasks.find((t) => t.id === taskId) : null;
  const isEdit = Boolean(taskId);

  const [form, setForm] = useState(() => ({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || 'medium',
    category: task?.category || 'assignment',
    status: task?.status || 'pending',
    course: task?.course ?? '',
    due_date: toDatetimeLocal(task?.due_date) || '',
    estimated_minutes: task?.estimated_minutes ?? '',
    ...(defaults || {}),
  }));
  const [draftSteps, setDraftSteps] = useState([]); // create mode only
  const [stepText, setStepText] = useState('');
  const [saving, setSaving] = useState(false);
  const titleRef = useRef(null);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // The task was deleted elsewhere while this was open.
  useEffect(() => {
    if (isEdit && !task) onClose();
  }, [isEdit, task, onClose]);

  const steps = isEdit ? (task?.subtasks || []) : draftSteps;

  const addStep = () => {
    const title = stepText.trim();
    if (!title) return;
    if (isEdit) data.addSubtask(taskId, title);
    else setDraftSteps((prev) => [...prev, { id: `draft-${Date.now()}`, title, done: false }]);
    setStepText('');
  };

  const removeStep = (step) => {
    if (isEdit) data.deleteSubtask(taskId, step.id);
    else setDraftSteps((prev) => prev.filter((s) => s.id !== step.id));
  };

  const submit = async (e) => {
    e.preventDefault();
    const title = form.title.trim();
    if (!title || saving) return;
    const payload = {
      title,
      description: form.description.trim(),
      priority: form.priority,
      category: form.category,
      status: form.status,
      course: form.course === '' ? null : Number(form.course),
      due_date: toIsoOrNull(form.due_date),
      estimated_minutes: form.estimated_minutes === '' ? null : Number(form.estimated_minutes),
    };
    setSaving(true);
    const ok = isEdit
      ? await data.updateTask(taskId, payload)
      : await data.createTask(payload, draftSteps.map((s) => s.title));
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? 'Edit task' : 'New task'}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.18 }}
        onSubmit={submit}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e); }}
      >
        <header className="modal-head">
          <h2>{isEdit ? 'Edit task' : 'New task'}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <Icon name="x" />
          </button>
        </header>

        <div className="modal-body">
          <input
            ref={titleRef}
            className="input input-title"
            placeholder="What do you need to do?"
            aria-label="Task title"
            value={form.title}
            maxLength={200}
            onChange={(e) => set('title', e.target.value)}
            required
          />
          <textarea
            className="input"
            rows={2}
            placeholder="Notes (optional)"
            aria-label="Notes"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />

          <div className="field-grid">
            <label className="field">
              <span className="field-label">Course</span>
              <select className="input" value={form.course} onChange={(e) => set('course', e.target.value)}>
                <option value="">No course</option>
                {data.courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Type</span>
              <select className="input" value={form.category} onChange={(e) => set('category', e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="field">
            <span className="field-label">Due</span>
            <div className="quick-row">
              <button type="button" className="pill" onClick={() => set('due_date', quickDate(0, 23))}>Today</button>
              <button type="button" className="pill" onClick={() => set('due_date', quickDate(1))}>Tomorrow</button>
              <button type="button" className="pill" onClick={() => set('due_date', quickDate(3))}>In 3 days</button>
              <button type="button" className="pill" onClick={() => set('due_date', quickDate(7))}>Next week</button>
              {form.due_date && (
                <button type="button" className="pill pill-ghost" onClick={() => set('due_date', '')}>Clear</button>
              )}
            </div>
            <input
              type="datetime-local"
              className="input"
              aria-label="Due date and time"
              value={form.due_date}
              onChange={(e) => set('due_date', e.target.value)}
            />
          </div>

          <div className="field-grid">
            <div className="field">
              <span className="field-label">Priority</span>
              <Segmented label="Priority" options={PRIORITIES} value={form.priority} onChange={(v) => set('priority', v)} />
            </div>
            {isEdit && (
              <div className="field">
                <span className="field-label">Status</span>
                <Segmented label="Status" options={STATUSES} value={form.status} onChange={(v) => set('status', v)} />
              </div>
            )}
          </div>

          <div className="field">
            <span className="field-label">Time needed</span>
            <div className="quick-row">
              {ESTIMATES.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`pill ${Number(form.estimated_minutes) === m ? 'is-active' : ''}`}
                  onClick={() => set('estimated_minutes', Number(form.estimated_minutes) === m ? '' : m)}
                >
                  {formatMinutes(m)}
                </button>
              ))}
              <input
                type="number"
                min="1"
                max="1440"
                className="input input-inline"
                placeholder="min"
                aria-label="Estimated minutes"
                value={form.estimated_minutes}
                onChange={(e) => set('estimated_minutes', e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <span className="field-label">
              Steps{steps.length > 0 && ` · ${steps.filter((s) => s.done).length}/${steps.length}`}
            </span>
            {steps.length > 0 && (
              <ul className="steps">
                {steps.map((step) => (
                  <li key={step.id} className={step.done ? 'is-done' : ''}>
                    {isEdit ? (
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={step.done}
                        aria-label={step.title}
                        className="check check-sm"
                        onClick={() => data.toggleSubtask(taskId, step)}
                      >
                        {step.done && <Icon name="check" size={12} />}
                      </button>
                    ) : (
                      <span className="check check-sm" aria-hidden="true" />
                    )}
                    <span className="step-title">{step.title}</span>
                    <button type="button" className="icon-btn" aria-label={`Remove step ${step.title}`} onClick={() => removeStep(step)}>
                      <Icon name="x" size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="step-add">
              <input
                className="input"
                placeholder="Break it down: add a step"
                aria-label="New step"
                value={stepText}
                maxLength={200}
                onChange={(e) => setStepText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
                    e.preventDefault();
                    addStep();
                  }
                }}
              />
              <button type="button" className="btn btn-quiet" onClick={addStep} disabled={!stepText.trim()}>
                Add
              </button>
            </div>
          </div>
        </div>

        <footer className="modal-foot">
          {isEdit && (
            <>
              <button
                type="button"
                className="btn btn-danger-quiet"
                onClick={() => { data.deleteTask(taskId); onClose(); }}
              >
                Delete
              </button>
              {form.status !== 'completed' && (
                <button type="button" className="btn btn-quiet" onClick={() => { onClose(); ui.startFocus(taskId); }}>
                  <Icon name="play" size={15} /> Focus
                </button>
              )}
            </>
          )}
          <span className="spacer" />
          <button type="button" className="btn btn-quiet" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving || !form.title.trim()}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add task'}
          </button>
        </footer>
      </motion.form>
    </motion.div>
  );
};

export default TaskModal;
