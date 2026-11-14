import { addDays, dayKey, startOfDay } from './dates';

/** Days (YYYY-MM-DD) on which something got done: a task completed or a focus session logged. */
export const activeDays = (tasks, sessions) => {
  const days = new Set();
  tasks.forEach((t) => { if (t.completed_at) days.add(dayKey(t.completed_at)); });
  sessions.forEach((s) => days.add(dayKey(s.started_at)));
  return days;
};

/** Consecutive active days ending today (or yesterday, so the streak survives until midnight). */
export const currentStreak = (tasks, sessions, now = Date.now()) => {
  const days = activeDays(tasks, sessions);
  let cursor = startOfDay(now);
  if (!days.has(dayKey(cursor))) cursor = addDays(cursor, -1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
};

/** Focus minutes for each of the last `count` days, oldest first. */
export const focusByDay = (sessions, count = 7, now = Date.now()) => {
  const totals = {};
  sessions.forEach((s) => {
    const k = dayKey(s.started_at);
    totals[k] = (totals[k] || 0) + s.minutes;
  });
  const today = startOfDay(now);
  return Array.from({ length: count }, (_, i) => {
    const date = addDays(today, i - (count - 1));
    return { date, minutes: totals[dayKey(date)] || 0, isToday: i === count - 1 };
  });
};

export const minutesOn = (sessions, date) => {
  const k = dayKey(date);
  return sessions.reduce((sum, s) => (dayKey(s.started_at) === k ? sum + s.minutes : sum), 0);
};
