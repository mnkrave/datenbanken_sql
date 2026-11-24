import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@clerk/react';
import { ALL_EXERCISES, getExerciseById } from './data/schemas';
import { getOfficialSheetExerciseIds } from './data/sheets';
import {
  computeStreak,
  getTodayKey,
  loadProgress,
  markExerciseSolved,
  resetAllProgress,
  resolveDailyPlan,
  saveDraft,
  saveProgress,
} from './engine/dailyPlan';
import {
  mergeLocalProgressToCloud,
  resetCloudProgress,
  syncDraftToCloud,
  syncSolvedToCloud,
  type CloudSyncStatus,
} from './lib/cloudSync';
import { ConfirmResetDialog } from './components/ConfirmResetDialog';
import { DailyDashboard } from './components/DailyDashboard';
import { ExerciseWorkspace } from './components/ExerciseWorkspace';
import { GroupView } from './components/GroupView';
import { Header, type AppView } from './components/Header';
import { SheetsView } from './components/SheetsView';
import type { Exercise, ProgressState } from './types/sql';

interface SyncApi {
  onSolve: (params: {
    exerciseId: string;
    schemaId: string;
    dateKey: string;
    sqlText?: string;
    dailyCompleted: boolean;
  }) => void;
  onDraft: (params: { exerciseId: string; schemaId: string; sqlText: string }) => void;
  onReset: () => void;
}

interface ClerkSyncControllerProps {
  todayKey: string;
  initialDailyIds: string[];
  syncApiRef: React.MutableRefObject<SyncApi | null>;
  onMerged: (merged: ProgressState, frozenIds: string[] | null) => void;
  onStatusChange: (status: CloudSyncStatus) => void;
  onSignedOut: () => void;
}

function ClerkSyncController({
  todayKey,
  initialDailyIds,
  syncApiRef,
  onMerged,
  onStatusChange,
  onSignedOut,
}: ClerkSyncControllerProps) {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const syncedUserRef = useRef<string | null>(null);
  const draftTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const isSignedInRef = useRef(isSignedIn);
  isSignedInRef.current = isSignedIn;

  useEffect(() => {
    syncApiRef.current = {
      onSolve: (params) => {
        const pendingTimer = draftTimersRef.current.get(params.exerciseId);
        if (pendingTimer) {
          clearTimeout(pendingTimer);
          draftTimersRef.current.delete(params.exerciseId);
        }
        if (!isSignedInRef.current) return;

        onStatusChange('syncing');
        syncSolvedToCloud(getTokenRef.current, params)
          .then(() => onStatusChange('synced'))
          .catch(() => onStatusChange('error'));
      },
      onDraft: (params) => {
        if (!isSignedInRef.current) return;
        const existing = draftTimersRef.current.get(params.exerciseId);
        if (existing) clearTimeout(existing);

        const timer = setTimeout(() => {
          draftTimersRef.current.delete(params.exerciseId);
          if (!isSignedInRef.current) return;
          syncDraftToCloud(getTokenRef.current, params)
            .then(() => onStatusChange('synced'))
            .catch(() => onStatusChange('error'));
        }, 700);

        draftTimersRef.current.set(params.exerciseId, timer);
      },
      onReset: () => {
        for (const t of draftTimersRef.current.values()) clearTimeout(t);
        draftTimersRef.current.clear();
        if (!isSignedInRef.current) return;

        onStatusChange('syncing');
        resetCloudProgress(getTokenRef.current)
          .then(() => onStatusChange('synced'))
          .catch(() => onStatusChange('error'));
      },
    };

    return () => {
      for (const t of draftTimersRef.current.values()) clearTimeout(t);
      draftTimersRef.current.clear();
      syncApiRef.current = null;
    };
  }, [syncApiRef, onStatusChange]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !userId) {
      if (syncedUserRef.current !== null) {
        syncedUserRef.current = null;
        onSignedOut();
      }
      return;
    }

    if (syncedUserRef.current === userId) return;
    syncedUserRef.current = userId;

    let active = true;
    onStatusChange('syncing');

    mergeLocalProgressToCloud(getTokenRef.current, loadProgress(), todayKey, initialDailyIds)
      .then((res) => {
        if (!active || !res) return;
        const merged: ProgressState = {
          solvedIds: res.solvedIds,
          drafts: res.drafts,
          activeDays: res.activeDays,
          completedDailyDates: res.completedDailyDates,
        };
        saveProgress(merged);
        onMerged(merged, res.dailySession);
        onStatusChange('synced');
      })
      .catch(() => {
        if (active) {
          syncedUserRef.current = null;
          onStatusChange('error');
        }
      });

    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn, userId, todayKey, initialDailyIds, onMerged, onStatusChange, onSignedOut]);

  return null;
}

interface AppProps {
  clerkEnabled?: boolean;
}

export function App({ clerkEnabled = false }: AppProps) {
  const todayKey = useMemo(() => getTodayKey(), []);
  const [frozenDailyIds, setFrozenDailyIds] = useState<string[] | null>(null);
  const dailyPlan = useMemo(
    () => resolveDailyPlan(todayKey, frozenDailyIds),
    [todayKey, frozenDailyIds]
  );
  const initialDailyIds = useMemo(
    () => resolveDailyPlan(todayKey, null).map((e) => e.id),
    [todayKey]
  );
  const officialSheetIds = useMemo(() => getOfficialSheetExerciseIds(), []);

  const [progress, setProgress] = useState<ProgressState>(() => loadProgress());
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>('local');
  const syncApiRef = useRef<SyncApi | null>(null);

  const [view, setView] = useState<AppView>('daily');
  const [returnView, setReturnView] = useState<'daily' | 'sheets' | 'catalog'>('daily');
  const [selectedSheet, setSelectedSheet] = useState<number | 'all'>('all');
  const [includeRaTasks, setIncludeRaTasks] = useState<boolean>(false);
  const [activeExerciseId, setActiveExerciseId] = useState<string>(dailyPlan[0].id);
  const [activePlaylist, setActivePlaylist] = useState<Exercise[]>(dailyPlan);
  const [playlistLabel, setPlaylistLabel] = useState<string>('Tages-Training');
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const activeExercise = getExerciseById(activeExerciseId) ?? dailyPlan[0];
  const dailySolvedCount = dailyPlan.filter((e) => Boolean(progress.solvedIds[e.id])).length;
  const sheetsSolvedCount = officialSheetIds.filter((id) => Boolean(progress.solvedIds[id])).length;
  const totalSolvedCount = ALL_EXERCISES.filter((e) => Boolean(progress.solvedIds[e.id])).length;
  const streak = computeStreak(progress.activeDays, todayKey);

  // Update <title> dynamically per accessibility guide
  useEffect(() => {
    if (view === 'daily') {
      document.title = 'Tages-Training | DBS I · SQL-Trainer';
    } else if (view === 'sheets') {
      document.title = 'Übungsblätter | DBS I · SQL-Trainer';
    } else if (view === 'catalog') {
      document.title = 'Alle 8 Schemas | DBS I · SQL-Trainer';
    } else if (view === 'group') {
      document.title = 'Lerngruppe | DBS I · SQL-Trainer';
    } else {
      document.title = `${activeExercise.title} | DBS I · SQL-Trainer`;
    }
  }, [view, activeExercise.title]);

  const handleMerged = useRef((merged: ProgressState, frozenIds: string[] | null) => {
    progressRef.current = merged;
    setProgress(merged);
    if (frozenIds && frozenIds.length > 0) {
      setFrozenDailyIds(frozenIds);
    }
  }).current;

  const handleSignedOut = useRef(() => {
    const fresh = resetAllProgress();
    progressRef.current = fresh;
    setProgress(fresh);
    setFrozenDailyIds(null);
    setSyncStatus('local');
  }).current;

  const handleStartExercise = (
    exerciseId: string,
    playlist: Exercise[],
    label: string
  ) => {
    if (view === 'daily' || view === 'sheets' || view === 'catalog') {
      setReturnView(view);
    }
    setActiveExerciseId(exerciseId);
    setActivePlaylist(playlist);
    setPlaylistLabel(label);
    setView('workspace');
    window.scrollTo({ top: 0 });
  };

  const handleNavigate = (target: 'daily' | 'sheets' | 'catalog' | 'group') => {
    setView(target);
    window.scrollTo({ top: 0 });
  };

  const handleSolved = (exerciseId: string) => {
    const ex = getExerciseById(exerciseId);
    const nextState = markExerciseSolved(progressRef.current, exerciseId, todayKey, dailyPlan);
    progressRef.current = nextState;
    setProgress(nextState);

    const dailyCompleted = dailyPlan.every((e) => Boolean(nextState.solvedIds[e.id]));
    syncApiRef.current?.onSolve({
      exerciseId,
      schemaId: ex?.schemaId ?? '',
      dateKey: todayKey,
      sqlText: nextState.drafts[exerciseId],
      dailyCompleted,
    });
  };

  const handleDraftChange = (exerciseId: string, sql: string) => {
    const ex = getExerciseById(exerciseId);
    const nextState = saveDraft(progressRef.current, exerciseId, sql);
    progressRef.current = nextState;
    setProgress(nextState);

    syncApiRef.current?.onDraft({
      exerciseId,
      schemaId: ex?.schemaId ?? '',
      sqlText: sql,
    });
  };

  const handleResetClose = (confirmed: boolean) => {
    setResetDialogOpen(false);
    if (confirmed) {
      const fresh = resetAllProgress();
      progressRef.current = fresh;
      setProgress(fresh);
      syncApiRef.current?.onReset();
    }
  };

  return (
    <div className="app-shell">
      {clerkEnabled && (
        <ClerkSyncController
          todayKey={todayKey}
          initialDailyIds={initialDailyIds}
          syncApiRef={syncApiRef}
          onMerged={handleMerged}
          onStatusChange={setSyncStatus}
          onSignedOut={handleSignedOut}
        />
      )}

      <Header
        view={view}
        onNavigate={handleNavigate}
        dailySolvedCount={dailySolvedCount}
        dailyTotalCount={dailyPlan.length}
        sheetsSolvedCount={sheetsSolvedCount}
        sheetsTotalCount={officialSheetIds.length}
        totalSolvedCount={totalSolvedCount}
        totalExerciseCount={ALL_EXERCISES.length}
        streak={streak}
        clerkEnabled={clerkEnabled}
        syncStatus={syncStatus}
        onRequestReset={() => setResetDialogOpen(true)}
      />

      <main className="main-content">
        {view === 'workspace' ? (
          <ExerciseWorkspace
            exercise={activeExercise}
            playlist={activePlaylist}
            playlistLabel={playlistLabel}
            solvedIds={progress.solvedIds}
            draftSql={progress.drafts[activeExercise.id] ?? activeExercise.starterSql ?? ''}
            onDraftChange={handleDraftChange}
            onSolved={handleSolved}
            onSelectExercise={(id) => {
              setActiveExerciseId(id);
              window.scrollTo({ top: 0 });
            }}
            onBack={() => handleNavigate(returnView)}
          />
        ) : view === 'sheets' ? (
          <SheetsView
            solvedIds={progress.solvedIds}
            selectedSheet={selectedSheet}
            onSelectSheet={setSelectedSheet}
            includeRaTasks={includeRaTasks}
            onToggleRaTasks={setIncludeRaTasks}
            onStartExercise={handleStartExercise}
          />
        ) : view === 'group' ? (
          <GroupView
            clerkEnabled={clerkEnabled}
            todayKey={todayKey}
            dailyPlan={dailyPlan}
            officialSheetIds={officialSheetIds}
          />
        ) : (
          <DailyDashboard
            mode={view}
            todayKey={todayKey}
            dailyPlan={dailyPlan}
            solvedIds={progress.solvedIds}
            onStartExercise={handleStartExercise}
          />
        )}
      </main>

      <ConfirmResetDialog open={resetDialogOpen} onClose={handleResetClose} />
    </div>
  );
}

export default App;
