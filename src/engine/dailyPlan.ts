import { ALL_SCHEMAS, getExercisesForSchema } from '../data/schemas';
import type { Exercise, ProgressState } from '../types/sql';

const STORAGE_KEY = 'dbs1_sql_trainer_progress_v1';

export function getTodayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatGermanDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/** Deterministic hash so each calendar day picks a stable, rotating exercise per schema */
function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Generates today's daily training plan: 1 exercise for each of the 8 schemas.
 * Shifts smoothly day-by-day so consecutive days do not repeat the same exercise.
 */
export function getDailyPlan(dateKey = getTodayKey()): Exercise[] {
  const [y, m, d] = dateKey.split('-').map(Number);
  const daySerial = Math.floor(Date.UTC(y, (m || 1) - 1, d || 1) / 86_400_000);

  return ALL_SCHEMAS.map((schema, schemaIdx) => {
    const list = getExercisesForSchema(schema.id);
    const offset = hashString(schema.id) % list.length;
    const pickedIdx = (daySerial + offset + schemaIdx) % list.length;
    return list[pickedIdx];
  });
}

export function emptyProgress(): ProgressState {
  return {
    solvedIds: {},
    activeDays: [],
    completedDailyDates: [],
    drafts: {},
  };
}

export function loadProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    return {
      solvedIds: parsed.solvedIds ?? {},
      activeDays: Array.isArray(parsed.activeDays) ? parsed.activeDays : [],
      completedDailyDates: Array.isArray(parsed.completedDailyDates)
        ? parsed.completedDailyDates
        : [],
      drafts: parsed.drafts ?? {},
    };
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(state: ProgressState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota / private-mode errors gracefully
  }
}

export function markExerciseSolved(
  prev: ProgressState,
  exerciseId: string,
  todayKey = getTodayKey()
): ProgressState {
  const solvedIds = { ...prev.solvedIds, [exerciseId]: todayKey };
  const activeDays = prev.activeDays.includes(todayKey)
    ? prev.activeDays
    : [...prev.activeDays, todayKey].sort();

  const dailyPlan = getDailyPlan(todayKey);
  const allDailySolved = dailyPlan.every((ex) => Boolean(solvedIds[ex.id]));
  const completedDailyDates =
    allDailySolved && !prev.completedDailyDates.includes(todayKey)
      ? [...prev.completedDailyDates, todayKey].sort()
      : prev.completedDailyDates;

  const next: ProgressState = {
    ...prev,
    solvedIds,
    activeDays,
    completedDailyDates,
  };
  saveProgress(next);
  return next;
}

export function saveDraft(prev: ProgressState, exerciseId: string, sql: string): ProgressState {
  const next: ProgressState = {
    ...prev,
    drafts: { ...prev.drafts, [exerciseId]: sql },
  };
  saveProgress(next);
  return next;
}

export function resetAllProgress(): ProgressState {
  const fresh = emptyProgress();
  saveProgress(fresh);
  return fresh;
}

/** Computes current consecutive-day practice streak ending today or yesterday */
export function computeStreak(activeDays: string[], todayKey = getTodayKey()): number {
  if (activeDays.length === 0) return 0;
  const set = new Set(activeDays);

  const parseDay = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const toKey = (dt: Date) => getTodayKey(dt);

  const cursor = parseDay(todayKey);
  if (!set.has(toKey(cursor))) {
    // Allow streak to remain alive if user practiced yesterday
    cursor.setDate(cursor.getDate() - 1);
    if (!set.has(toKey(cursor))) return 0;
  }

  let streak = 0;
  while (set.has(toKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
