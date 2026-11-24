import type { ProgressState } from '../types/sql';

export type CloudSyncStatus = 'local' | 'syncing' | 'synced' | 'error';

export interface CloudProgressResponse {
  solvedIds: Record<string, string>;
  drafts: Record<string, string>;
  activeDays: string[];
  completedDailyDates: string[];
  dailySession: string[] | null;
}

export type GetTokenFn = () => Promise<string | null>;

async function authedRequest<T>(
  getToken: GetTokenFn,
  init: RequestInit & { path?: string }
): Promise<T | null> {
  let token: string | null = null;
  try {
    token = await getToken();
  } catch {
    // Clerk Core 3 may throw ClerkOfflineError when offline
    return null;
  }

  if (!token) return null;

  const response = await fetch(init.path ?? '/api/progress', {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`API ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function mergeLocalProgressToCloud(
  getToken: GetTokenFn,
  localState: ProgressState,
  todayKey: string,
  todayExerciseIds: string[]
): Promise<CloudProgressResponse | null> {
  return authedRequest<CloudProgressResponse>(getToken, {
    method: 'POST',
    body: JSON.stringify({
      action: 'merge_local',
      solvedIds: localState.solvedIds,
      drafts: localState.drafts,
      activeDays: localState.activeDays,
      completedDailyDates: localState.completedDailyDates,
      todayKey,
      todayExerciseIds,
    }),
  });
}

export async function syncSolvedToCloud(
  getToken: GetTokenFn,
  params: {
    exerciseId: string;
    schemaId: string;
    dateKey: string;
    sqlText?: string;
    dailyCompleted: boolean;
  }
): Promise<void> {
  await authedRequest(getToken, {
    method: 'POST',
    body: JSON.stringify({
      action: 'solve',
      ...params,
    }),
  });
}

export async function syncDraftToCloud(
  getToken: GetTokenFn,
  params: {
    exerciseId: string;
    schemaId: string;
    sqlText: string;
  }
): Promise<void> {
  await authedRequest(getToken, {
    method: 'POST',
    body: JSON.stringify({
      action: 'draft',
      ...params,
    }),
  });
}

export async function resetCloudProgress(getToken: GetTokenFn): Promise<void> {
  await authedRequest(getToken, {
    method: 'DELETE',
  });
}
