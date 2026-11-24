import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  Lightbulb,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { SCHEMA_MAP } from '../data/schemas';
import { evaluateExercise, runSandboxQuery } from '../engine/evaluator';
import { getPhysicalTables } from '../engine/pgEngine';
import type { EvaluationResult, Exercise } from '../types/sql';
import { ResultTable } from './ResultTable';
import { SchemaExplorer } from './SchemaExplorer';
import { SqlEditor } from './SqlEditor';

interface ExerciseWorkspaceProps {
  exercise: Exercise;
  playlist: Exercise[];
  playlistLabel: string;
  solvedIds: Record<string, string>;
  draftSql: string;
  onDraftChange: (exerciseId: string, sql: string) => void;
  onSolved: (exerciseId: string) => void;
  onSelectExercise: (exerciseId: string) => void;
  onBack: () => void;
}

function difficultyBadgeClass(diff: Exercise['difficulty']): string {
  if (diff === 'Basis') return 'badge badge--basis';
  if (diff === 'Mittel') return 'badge badge--mittel';
  return 'badge badge--klausur';
}

export function ExerciseWorkspace({
  exercise,
  playlist,
  playlistLabel,
  solvedIds,
  draftSql,
  onDraftChange,
  onSolved,
  onSelectExercise,
  onBack,
}: ExerciseWorkspaceProps) {
  const schema = SCHEMA_MAP[exercise.schemaId];
  const [sql, setSql] = useState(draftSql);
  const [isRunning, setIsRunning] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [showExpected, setShowExpected] = useState(false);
  const [tableNames, setTableNames] = useState<string[]>([]);

  const currentIdx = playlist.findIndex((e) => e.id === exercise.id);
  const prevExercise = currentIdx > 0 ? playlist[currentIdx - 1] : null;
  const nextExercise =
    currentIdx >= 0 && currentIdx < playlist.length - 1 ? playlist[currentIdx + 1] : null;
  const isSolved = Boolean(solvedIds[exercise.id]);

  // Sync editor state when switching exercises
  useEffect(() => {
    setSql(draftSql);
    setEvaluation(null);
    setShowExpected(false);
  }, [exercise.id]);

  useEffect(() => {
    let active = true;
    getPhysicalTables(exercise.schemaId)
      .then((tables) => {
        if (active) setTableNames(tables);
      })
      .catch(() => {
        if (active) setTableNames([]);
      });
    return () => {
      active = false;
    };
  }, [exercise.schemaId]);

  const handleSqlChange = (nextSql: string) => {
    setSql(nextSql);
    onDraftChange(exercise.id, nextSql);
  };

  const handleEvaluate = async () => {
    setIsRunning(true);
    try {
      const res = await evaluateExercise(exercise, sql);
      setEvaluation(res);
      if (res.status === 'correct') {
        onSolved(exercise.id);
        setShowExpected(false);
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleSandbox = async () => {
    setIsRunning(true);
    try {
      const res = await runSandboxQuery(exercise, sql);
      setEvaluation(res);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div>
      <div className="workspace-topbar">
        <button type="button" className="btn btn-sm" onClick={onBack}>
          <ArrowLeft size={15} aria-hidden="true" />
          Zurück zu {playlistLabel}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className="stat-chip">
            Aufgabe {currentIdx >= 0 ? currentIdx + 1 : 1} / {playlist.length}
          </span>
          <button
            type="button"
            className="btn btn-sm"
            disabled={!prevExercise}
            onClick={() => prevExercise && onSelectExercise(prevExercise.id)}
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Vorherige
          </button>
          <button
            type="button"
            className="btn btn-sm"
            disabled={!nextExercise}
            onClick={() => nextExercise && onSelectExercise(nextExercise.id)}
          >
            Nächste
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="workspace-grid">
        {/* LEFT COLUMN: Task Description + Schema Documentation + Hints/Solution */}
        <div>
          <section className="panel" aria-labelledby="main-content">
            <div className="task-meta-row">
              <span className="schema-pill">{schema.shortTitle}</span>
              <span className={difficultyBadgeClass(exercise.difficulty)}>
                {exercise.difficulty}
              </span>
              <span className="section-meta">{exercise.source}</span>
              {isSolved && (
                <span className="badge badge--basis">
                  <CheckCircle2 size={12} aria-hidden="true" />
                  Gelöst
                </span>
              )}
            </div>

            <h1 id="main-content" tabIndex={-1} className="task-title">
              {exercise.title}
            </h1>

            <p className="task-prompt">{exercise.prompt}</p>

            <div className="spec-box">
              <span className="spec-item">
                <strong>Erwartete Spalten ({exercise.expectedColumns.length}):</strong>{' '}
                {exercise.expectedColumns.map((col, i) => (
                  <span key={`${col}-${i}`}>
                    <code className="spec-code">{col}</code>
                    {i < exercise.expectedColumns.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </span>
              <span className="spec-item">
                <strong>Reihenfolge:</strong>{' '}
                {exercise.orderMatters ? 'Wichtig (ORDER BY prüfen)' : 'Beliebig'}
              </span>
              {exercise.requiresDistinct && (
                <span className="spec-item">
                  <strong>Duplikate:</strong> Keine (DISTINCT)
                </span>
              )}
            </div>

            <ul className="topic-list" role="list">
              {exercise.topics.map((topic) => (
                <li key={topic} className="topic-tag">
                  {topic}
                </li>
              ))}
            </ul>
          </section>

          <div style={{ marginBlockStart: '1rem' }}>
            <SchemaExplorer schema={schema} />
          </div>

          <div className="accordion" style={{ marginBlockStart: '1rem' }}>
            <details>
              <summary>
                <Lightbulb size={15} aria-hidden="true" />
                Hinweise ({exercise.hints.length})
              </summary>
              <div className="details-body">
                <ol style={{ margin: 0, paddingInlineStart: '1.2rem', fontSize: '0.88rem' }}>
                  {exercise.hints.map((hint, i) => (
                    <li key={i} style={{ marginBlockEnd: '0.4rem' }}>
                      {hint}
                    </li>
                  ))}
                </ol>
              </div>
            </details>

            <details>
              <summary>
                <Eye size={15} aria-hidden="true" />
                Musterlösung &amp; Erklärung anzeigen
              </summary>
              <div className="details-body">
                <pre className="solution-pre">
                  <code>{exercise.solutionSql}</code>
                </pre>
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                  {exercise.solutionExplanation}
                </p>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => handleSqlChange(exercise.solutionSql)}
                >
                  In den Editor übernehmen
                </button>
              </div>
            </details>
          </div>
        </div>

        {/* RIGHT COLUMN: SQL Editor + Live Evaluation + Result Tables */}
        <div>
          <section className="panel" aria-label="SQL-Editor und Auswertung">
            <SqlEditor
              value={sql}
              onChange={handleSqlChange}
              onEvaluate={handleEvaluate}
              onRunSandbox={handleSandbox}
              onReset={() => {
                handleSqlChange('');
                setEvaluation(null);
              }}
              tableNames={tableNames}
              isRunning={isRunning}
            />
          </section>

          <div aria-live="polite" aria-atomic="true" style={{ marginBlockStart: '1rem' }}>
            {evaluation && (
              <section className="panel" aria-label="Abfrageergebnis">
                <div className={`eval-banner eval-banner--${evaluation.status}`}>
                  <div className="eval-headline">
                    <span className="eval-headline-left">
                      {evaluation.status === 'correct' && (
                        <CheckCircle2 size={20} aria-hidden="true" />
                      )}
                      {evaluation.status === 'wrong' && (
                        <XCircle size={20} aria-hidden="true" />
                      )}
                      {evaluation.status === 'error' && (
                        <AlertCircle size={20} aria-hidden="true" />
                      )}
                      {evaluation.status === 'sandbox' && (
                        <Sparkles size={18} aria-hidden="true" />
                      )}
                      {evaluation.headline}
                    </span>

                    <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                      {evaluation.status === 'wrong' && evaluation.expectedResult && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => setShowExpected((prev) => !prev)}
                        >
                          {showExpected
                            ? 'Erwartetes Ergebnis ausblenden'
                            : 'Mit erwartetem Ergebnis vergleichen'}
                        </button>
                      )}
                      {evaluation.status === 'correct' && nextExercise && (
                        <button
                          type="button"
                          className="btn btn-success btn-sm"
                          onClick={() => onSelectExercise(nextExercise.id)}
                        >
                          Nächste Aufgabe
                          <ArrowRight size={14} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>

                  {evaluation.errorMessage && (
                    <pre className="eval-error-pre">{evaluation.errorMessage}</pre>
                  )}

                  {evaluation.details.length > 0 && (
                    <ul className="eval-details">
                      {evaluation.details.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="tables-compare-grid">
                  {evaluation.userResult && (
                    <ResultTable
                      title="Dein Abfrageergebnis"
                      result={evaluation.userResult}
                    />
                  )}

                  {showExpected && evaluation.expectedResult && (
                    <ResultTable
                      title="Erwartetes Ergebnis (Musterlösung)"
                      result={evaluation.expectedResult}
                    />
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
