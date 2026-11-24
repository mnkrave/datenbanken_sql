import { useEffect, useMemo, useState } from 'react';
import { ALL_EXERCISES, getExerciseById } from './data/schemas';
import { getOfficialSheetExerciseIds } from './data/sheets';
import {
  computeStreak,
  getDailyPlan,
  getTodayKey,
  loadProgress,
  markExerciseSolved,
  resetAllProgress,
  saveDraft,
} from './engine/dailyPlan';
import { ConfirmResetDialog } from './components/ConfirmResetDialog';
import { DailyDashboard } from './components/DailyDashboard';
import { ExerciseWorkspace } from './components/ExerciseWorkspace';
import { Header, type AppView } from './components/Header';
import { SheetsView } from './components/SheetsView';
import type { Exercise, ProgressState } from './types/sql';

export function App() {
  const todayKey = useMemo(() => getTodayKey(), []);
  const dailyPlan = useMemo(() => getDailyPlan(todayKey), [todayKey]);
  const officialSheetIds = useMemo(() => getOfficialSheetExerciseIds(), []);

  const [progress, setProgress] = useState<ProgressState>(() => loadProgress());
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
    } else {
      document.title = `${activeExercise.title} | DBS I · SQL-Trainer`;
    }
  }, [view, activeExercise.title]);

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

  const handleNavigate = (target: 'daily' | 'sheets' | 'catalog') => {
    setView(target);
    window.scrollTo({ top: 0 });
  };

  const handleSolved = (exerciseId: string) => {
    setProgress((prev) => markExerciseSolved(prev, exerciseId, todayKey));
  };

  const handleDraftChange = (exerciseId: string, sql: string) => {
    setProgress((prev) => saveDraft(prev, exerciseId, sql));
  };

  const handleResetClose = (confirmed: boolean) => {
    setResetDialogOpen(false);
    if (confirmed) {
      setProgress(resetAllProgress());
    }
  };

  return (
    <div className="app-shell">
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
