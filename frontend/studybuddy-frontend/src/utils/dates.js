const pad = (n) => String(n).padStart(2, '0');

export const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

// Local calendar day as YYYY-MM-DD; used as a map key.
export const dayKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};

// Whole calendar days from `from` to `to` (negative when `to` is earlier).
export const dayDiff = (to, from) =>
  Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86400000);

export const toDatetimeLocal = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return `${dayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const toIsoOrNull = (datetimeLocal) =>
  datetimeLocal ? new Date(datetimeLocal).toISOString() : null;

// datetime-local value for `daysOffset` days from now at a given hour.
export const quickDate = (daysOffset, hour = 17) => {
  const d = addDays(new Date(), daysOffset);
  d.setHours(hour, 0, 0, 0);
  return toDatetimeLocal(d);
};

export const formatTime = (d) =>
  new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export const formatMinutes = (mins) => {
  const m = Math.round(mins || 0);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h}h ${rest}m` : `${h}h`;
};

/**
 * Describe a task's due date relative to now.
 * tone: 'overdue' | 'today' | 'soon' | 'later' | 'none'
 */
export const dueInfo = (task, now = Date.now()) => {
  if (!task.due_date) return { tone: 'none', label: 'No due date', bucket: 'none' };
  const due = new Date(task.due_date);
  const days = dayDiff(due, now);
  const time = formatTime(due);
  const done = task.status === 'completed';

  if (!done && due.getTime() < now) {
    const hoursLate = Math.floor((now - due.getTime()) / 3600000);
    const late =
      days === 0 ? (hoursLate < 1 ? 'just now' : `${hoursLate}h ago`)
      : days === -1 ? 'yesterday'
      : `${Math.abs(days)} days ago`;
    return { tone: 'overdue', label: `Overdue · ${late}`, bucket: 'overdue' };
  }
  if (days === 0) return { tone: done ? 'later' : 'today', label: `Today ${time}`, bucket: 'today' };
  if (days === 1) return { tone: done ? 'later' : 'soon', label: `Tomorrow ${time}`, bucket: 'tomorrow' };
  if (days > 1 && days < 7) {
    const weekday = due.toLocaleDateString([], { weekday: 'short' });
    return { tone: done || days > 3 ? 'later' : 'soon', label: `${weekday} ${time}`, bucket: 'week' };
  }
  const sameYear = due.getFullYear() === new Date(now).getFullYear();
  const label = due.toLocaleDateString([], {
    month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }),
  });
  return { tone: 'later', label, bucket: days < 0 ? 'past' : 'later' };
};

export const BUCKETS = [
  { key: 'overdue', label: 'Overdue' },
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'week', label: 'This week' },
  { key: 'later', label: 'Later' },
  { key: 'none', label: 'No due date' },
  { key: 'past', label: 'Earlier' },
];

export const greeting = (now = new Date()) => {
  const h = new Date(now).getHours();
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};
