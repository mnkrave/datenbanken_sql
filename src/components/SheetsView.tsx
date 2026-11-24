import { useMemo } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  FileText,
  Info,
  Play,
  Sparkles,
} from 'lucide-react';
import { SCHEMA_MAP, getExerciseById } from '../data/schemas';
import { WORKSHEETS, getOfficialSheetExerciseIds } from '../data/sheets';
import type { Difficulty, Exercise } from '../types/sql';
import { MathText } from './MathText';

interface SheetsViewProps {
  solvedIds: Record<string, string>;
  selectedSheet: number | 'all';
  onSelectSheet: (sheet: number | 'all') => void;
  includeRaTasks: boolean;
  onToggleRaTasks: (next: boolean) => void;
  onStartExercise: (exerciseId: string, playlist: Exercise[], playlistLabel: string) => void;
}

function difficultyBadgeClass(diff: Difficulty): string {
  if (diff === 'Basis') return 'badge badge--basis';
  if (diff === 'Mittel') return 'badge badge--mittel';
  return 'badge badge--klausur';
}

function buildPlaylist(ids: string[]): Exercise[] {
  const seen = new Set<string>();
  const list: Exercise[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    const ex = getExerciseById(id);
    if (ex) {
      seen.add(id);
      list.push(ex);
    }
  }
  return list;
}

export function SheetsView({
  solvedIds,
  selectedSheet,
  onSelectSheet,
  includeRaTasks,
  onToggleRaTasks,
  onStartExercise,
}: SheetsViewProps) {
  const officialIds = useMemo(() => getOfficialSheetExerciseIds(), []);
  const officialPlaylist = useMemo(() => buildPlaylist(officialIds), [officialIds]);
  const officialSolvedCount = officialIds.filter((id) => Boolean(solvedIds[id])).length;
  const officialPct =
    officialIds.length > 0 ? Math.round((officialSolvedCount / officialIds.length) * 100) : 0;
  const nextUnsolvedOfficialId =
    officialIds.find((id) => !solvedIds[id]) ?? officialIds[0];

  const availableSheets = useMemo(
    () =>
      WORKSHEETS.filter(
        (sheet) => includeRaTasks || sheet.tasks.some((task) => task.isOfficialSql)
      ),
    [includeRaTasks]
  );

  const visibleSheets = useMemo(
    () =>
      availableSheets.filter(
        (sheet) => selectedSheet === 'all' || sheet.sheetNumber === selectedSheet
      ),
    [availableSheets, selectedSheet]
  );

  const handleToggleRa = (next: boolean) => {
    onToggleRaTasks(next);
    if (!next && (selectedSheet === 3 || selectedSheet === 9)) {
      onSelectSheet('all');
    }
  };

  return (
    <div>
      <section className="hero-card" aria-labelledby="main-content">
        <div className="hero-copy">
          <div className="hero-eyebrow">
            <FileText size={15} aria-hidden="true" />
            Original-Aufgaben aus den Übungsblättern
          </div>
          <h1 id="main-content" tabIndex={-1} className="hero-title">
            Übungsblätter – SQL-Aufgaben &amp; Teilaufgaben
          </h1>
          <p className="hero-desc">
            Alle offiziellen SQL-Aufgaben der Blätter 4 bis 7 – gegliedert nach Blatt, Aufgabe
            und einzelnen Teilaufgaben wie <code className="inline-code">(a)</code>,{' '}
            <code className="inline-code">(b)</code>, <code className="inline-code">(c)</code> …
            Inklusive automatischer DDL-/INSERT-/DELETE-Prüfung und FD-Gegenbeispieltests direkt in
            PostgreSQL.
          </p>
        </div>

        <div className="hero-progress">
          <div className="progress-row">
            <span>Offizielle SQL-Teilaufgaben</span>
            <span>
              {officialSolvedCount} / {officialIds.length} ({officialPct} %)
            </span>
          </div>
          <div className="progress-bar-track" aria-hidden="true">
            <div
              className={`progress-bar-fill ${officialSolvedCount === officialIds.length ? 'progress-bar-fill--done' : ''}`}
              style={{ width: `${officialPct}%` }}
            />
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() =>
              nextUnsolvedOfficialId &&
              onStartExercise(nextUnsolvedOfficialId, officialPlaylist, 'Übungsblätter (SQL)')
            }
          >
            <Sparkles size={16} aria-hidden="true" />
            {officialSolvedCount === officialIds.length
              ? 'Alle SQL-Blätter wiederholen'
              : officialSolvedCount === 0
                ? 'Erste Blatt-Aufgabe starten'
                : 'Nächste offene Blatt-Aufgabe starten'}
          </button>
        </div>
      </section>

      <div className="filter-bar sheet-filter-bar" role="region" aria-label="Übungsblatt-Filter">
        <div className="sheet-filter-pills" role="group" aria-label="Blatt auswählen">
          <button
            type="button"
            className="sheet-pill-btn"
            aria-pressed={selectedSheet === 'all'}
            onClick={() => onSelectSheet('all')}
          >
            Alle SQL-Blätter
          </button>
          {availableSheets.map((sheet) => (
            <button
              key={sheet.sheetNumber}
              type="button"
              className="sheet-pill-btn"
              aria-pressed={selectedSheet === sheet.sheetNumber}
              onClick={() => onSelectSheet(sheet.sheetNumber)}
            >
              Blatt {sheet.sheetNumber}
            </button>
          ))}
        </div>

        <label className="sheet-toggle-label">
          <input
            type="checkbox"
            className="sheet-toggle-checkbox"
            checked={includeRaTasks}
            onChange={(e) => handleToggleRa(e.target.checked)}
          />
          <span>Auch RA-/Tupelkalkül-Aufgaben (Blatt 3, 4 &amp; 9) als SQL üben</span>
        </label>
      </div>

      <div className="sheets-stack">
        {visibleSheets.map((sheet) => {
          const visibleTasks = sheet.tasks.filter(
            (task) => includeRaTasks || task.isOfficialSql
          );
          const sheetIds = visibleTasks.flatMap((t) => t.subtasks.map((s) => s.exerciseId));
          const sheetPlaylist = buildPlaylist(sheetIds);
          const uniqueSheetIds = sheetPlaylist.map((e) => e.id);
          const sheetSolved = uniqueSheetIds.filter((id) => Boolean(solvedIds[id])).length;
          const nextSheetOpenId =
            uniqueSheetIds.find((id) => !solvedIds[id]) ?? uniqueSheetIds[0];

          return (
            <article key={sheet.sheetNumber} className="sheet-card">
              <div className="sheet-card-head">
                <div>
                  <div className="sheet-meta-line">
                    <span>{sheet.chapters}</span>
                    <span aria-hidden="true">·</span>
                    <span>{sheet.date}</span>
                  </div>
                  <h2 className="sheet-card-title">{sheet.title}</h2>
                </div>

                <div className="sheet-head-actions">
                  <span
                    className={`stat-chip ${sheetSolved === uniqueSheetIds.length && uniqueSheetIds.length > 0 ? 'stat-chip--done' : ''}`}
                  >
                    {sheetSolved}/{uniqueSheetIds.length} gelöst
                  </span>
                  {nextSheetOpenId && (
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() =>
                        onStartExercise(nextSheetOpenId, sheetPlaylist, sheet.title)
                      }
                    >
                      <Play size={14} aria-hidden="true" />
                      Blatt starten
                    </button>
                  )}
                </div>
              </div>

              <p className="sheet-card-summary">
                <MathText text={sheet.summary} />
              </p>

              <div className="sheet-task-groups">
                {visibleTasks.map((task) => {
                  const schema = SCHEMA_MAP[task.schemaId];
                  const taskIds = task.subtasks.map((s) => s.exerciseId);
                  const taskPlaylist = buildPlaylist(taskIds);
                  const firstOpenTaskId =
                    taskIds.find((id) => !solvedIds[id]) ?? taskIds[0];

                  return (
                    <section key={task.id} className="sheet-task-group">
                      <div className="sheet-task-head">
                        <div className="sheet-task-title-wrap">
                          <span className="schema-pill">{task.taskNumber}</span>
                          <h3 className="sheet-task-title">{task.title}</h3>
                        </div>

                        <div className="sheet-task-badges">
                          <span className="schema-pill">{schema.shortTitle}</span>
                          {task.originalKind && (
                            <span className="sheet-kind-badge">{task.originalKind}</span>
                          )}
                          {task.subtasks.length > 1 && firstOpenTaskId && (
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() =>
                                onStartExercise(
                                  firstOpenTaskId,
                                  taskPlaylist,
                                  `${sheet.title} · ${task.taskNumber}`
                                )
                              }
                            >
                              Aufgabe starten
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="sheet-task-intro">
                        <MathText text={task.intro} />
                      </p>

                      <ul className="sheet-subtask-list" role="list">
                        {task.subtasks.map((sub) => {
                          const ex = getExerciseById(sub.exerciseId);
                          if (!ex) return null;
                          const solved = Boolean(solvedIds[ex.id]);

                          return (
                            <li key={sub.exerciseId}>
                              <button
                                type="button"
                                className={`sheet-subtask-btn ${solved ? 'sheet-subtask-btn--solved' : ''}`}
                                onClick={() =>
                                  onStartExercise(
                                    ex.id,
                                    taskPlaylist,
                                    `${sheet.title} · ${task.taskNumber}`
                                  )
                                }
                              >
                                <span className="sheet-subtask-left">
                                  {solved ? (
                                    <CheckCircle2
                                      size={16}
                                      style={{ color: 'var(--success)', flexShrink: 0 }}
                                      aria-hidden="true"
                                    />
                                  ) : (
                                    <Circle
                                      size={16}
                                      style={{ color: 'var(--text-muted)', flexShrink: 0 }}
                                      aria-hidden="true"
                                    />
                                  )}
                                  <span className="subtask-badge">{sub.label}</span>
                                  <span className="sheet-subtask-title">{ex.title}</span>
                                </span>

                                <span className="sheet-subtask-right">
                                  {sub.kindBadge && (
                                    <span className="sheet-kind-badge">{sub.kindBadge}</span>
                                  )}
                                  <span className={difficultyBadgeClass(ex.difficulty)}>
                                    {ex.difficulty}
                                  </span>
                                  <span className="sheet-action-label">
                                    {solved ? 'Nochmal' : 'Lösen'}
                                    <ArrowRight size={14} aria-hidden="true" />
                                  </span>
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  );
                })}
              </div>

              {sheet.infoNote && (
                <div className="sheet-info-note">
                  <Info size={15} className="sheet-info-icon" aria-hidden="true" />
                  <span>
                    <MathText text={sheet.infoNote} />
                  </span>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <p className="sheet-theory-note">
        Hinweis zu den übrigen Blättern: Übungsblatt 1, 2, 8 und 10 (sowie die Theorie-Teile auf
        Blatt 3, 4, 7 und 9) behandeln ER-Modellierung, Normalformen, funktionale Abhängigkeiten,
        B-Bäume, Query-Pläne sowie ACID/Recovery auf Papier ohne eigene SQL-Schreibaufgaben.
      </p>
    </div>
  );
}
