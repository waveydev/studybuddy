import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_DURATIONS = { focus: 25, short: 5, long: 15 };
const ROUNDS_BEFORE_LONG_BREAK = 4;
const STORAGE_KEY = 'sb:durations';

const loadDurations = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { ...DEFAULT_DURATIONS, ...(saved || {}) };
  } catch {
    return DEFAULT_DURATIONS;
  }
};

const beep = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
    osc.start();
    osc.stop(ctx.currentTime + 0.85);
    osc.onended = () => ctx.close();
  } catch {
    // Sound is a nicety; never let it break the timer.
  }
};

/**
 * Pomodoro-style timer. Lives at the app root so it keeps running while the
 * student moves between views. Calls onFocusEnd({ minutes, taskId, startedAt })
 * whenever a focus block ends with at least one minute on the clock.
 */
export default function useFocusTimer({ onFocusEnd }) {
  const [durations, setDurations] = useState(loadDurations);
  const [mode, setMode] = useState('focus');
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(durations.focus * 60000);
  const [taskId, setTaskId] = useState(null);
  const [rounds, setRounds] = useState(0);

  const endsAt = useRef(null);
  const startedAt = useRef(null);
  // The interval reads the latest values through this ref.
  const live = useRef({});
  live.current = { durations, mode, remaining, taskId, rounds, onFocusEnd };

  const total = durations[mode] * 60000;
  const started = remaining < total;

  const goTo = useCallback((nextMode) => {
    endsAt.current = null;
    startedAt.current = null;
    setRunning(false);
    setMode(nextMode);
    setRemaining(live.current.durations[nextMode] * 60000);
  }, []);

  // End the current block. `elapsedMs` is how much of it was actually spent.
  const finish = useCallback((elapsedMs) => {
    const { mode: m, taskId: id, rounds: r, onFocusEnd: report } = live.current;
    if (m !== 'focus') {
      goTo('focus');
      return;
    }
    const minutes = Math.round(elapsedMs / 60000);
    if (minutes >= 1) {
      report({ minutes, taskId: id, startedAt: startedAt.current || Date.now() - elapsedMs });
    }
    setRounds(r + 1);
    goTo((r + 1) % ROUNDS_BEFORE_LONG_BREAK === 0 ? 'long' : 'short');
  }, [goTo]);

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      const left = endsAt.current - Date.now();
      if (left <= 0) {
        beep();
        finish(live.current.durations[live.current.mode] * 60000);
      } else {
        setRemaining(left);
      }
    }, 250);
    return () => clearInterval(id);
  }, [running, finish]);

  const start = () => {
    if (!startedAt.current) startedAt.current = Date.now();
    endsAt.current = Date.now() + remaining;
    setRunning(true);
  };

  const pause = () => {
    setRemaining(Math.max(0, endsAt.current - Date.now()));
    setRunning(false);
  };

  const reset = () => goTo(mode);

  const finishEarly = () => {
    const left = running ? Math.max(0, endsAt.current - Date.now()) : remaining;
    finish(total - left);
  };

  const setDuration = (which, minutes) => {
    const value = Math.min(180, Math.max(1, Math.round(Number(minutes) || 1)));
    const next = { ...durations, [which]: value };
    setDurations(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* private mode */ }
    if (which === mode && !running && !started) setRemaining(value * 60000);
  };

  return {
    mode, running, remaining, total, started, durations, taskId, rounds,
    start, pause, reset, finishEarly, setDuration,
    switchMode: goTo,
    selectTask: setTaskId,
  };
}

export const formatClock = (ms) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};
