import { useMemo, useState } from 'react';
import { ArrowRight, CalendarCheck2, CheckCircle2, Circle, Sparkles } from 'lucide-react';
import { ALL_EXERCISES, ALL_SCHEMAS, SCHEMA_MAP, getExercisesForSchema } from '../data/schemas';
import { formatGermanDate } from '../engine/dailyPlan';
import type { Difficulty, Exercise, SchemaId } from '../types/sql';

interface DailyDashboardProps {
  mode: 'daily' | 'catalog';
  todayKey: string;
  dailyPlan: Exercise[];
  solvedIds: Record<string, string>;
  onStartExercise: (exerciseId: string, playlist: Exercise[], playlistLabel: string) => void;
}

function difficultyBadgeClass(diff: Difficulty): string {
  if (diff === 'Basis') return 'badge badge--basis';
  if (diff === 'Mittel') return 'badge badge--mittel';
  return 'badge badge--klausur';
}

export function DailyDashboard({
  mode,
  todayKey,
  dailyPlan,
  solvedIds,
  onStartExercise,
}: DailyDashboardProps) {
  const [selectedSchema, setSelectedSchema] = useState<SchemaId | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | 'all'>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');

  const dailySolvedCount = dailyPlan.filter((e) => Boolean(solvedIds[e.id])).length;
  const dailyPct = Math.round((dailySolvedCount / dailyPlan.length) * 100);
  const nextUnsolvedDaily = dailyPlan.find((e) => !solvedIds[e.id]) ?? dailyPlan[0];

  const allTopics = useMemo(() => {
    const set = new Set<string>();
    for (const ex of ALL_EXERCISES) {
      for (const t of ex.topics) set.add(t);
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'de'));
  }, []);

  if (mode === 'daily') {
    return (
      <div>
        <section className="hero-card" aria-labelledby="main-content">
          <div className="hero-copy">
            <div className="hero-eyebrow">
              <CalendarCheck2 size={15} aria-hidden="true" />
              Tages-Training · {formatGermanDate(todayKey)}
            </div>
            <h1 id="main-content" tabIndex={-1} className="hero-title">
              Deine 8 SQL-Aufgaben für heute
            </h1>
            <p className="hero-desc">
              Jeden Tag wartet eine rotierende Klausur-Übung pro zentralem Übungsblatt-Schema auf
              dich. Deine Abfragen laufen direkt in einer echten PostgreSQL-Engine im Browser und
              werden sofort auf Korrektheit geprüft.
            </p>
          </div>

          <div className="hero-progress">
            <div className="progress-row">
              <span>Tagesfortschritt</span>
              <span>
                {dailySolvedCount} / {dailyPlan.length} ({dailyPct} %)
              </span>
            </div>
            <div className="progress-bar-track" aria-hidden="true">
              <div
                className={`progress-bar-fill ${dailySolvedCount === dailyPlan.length ? 'progress-bar-fill--done' : ''}`}
                style={{ width: `${dailyPct}%` }}
              />
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onStartExercise(nextUnsolvedDaily.id, dailyPlan, 'Tages-Training')}
            >
              <Sparkles size={16} aria-hidden="true" />
              {dailySolvedCount === dailyPlan.length
                ? 'Tagesaufgaben wiederholen'
                : dailySolvedCount === 0
                  ? 'Heutiges Training starten'
                  : 'Nächste offene Aufgabe starten'}
            </button>
          </div>
        </section>

        <div className="section-header">
          <h2 className="section-title">1 Aufgabe pro Klausur-Schema</h2>
          <span className="section-meta">
            Alle 8 zentralen Schemas aus den Übungsblättern 3–9
          </span>
        </div>

        <div className="daily-grid">
          {dailyPlan.map((ex, index) => {
            const schema = SCHEMA_MAP[ex.schemaId];
            const solved = Boolean(solvedIds[ex.id]);
            return (
              <article
                key={ex.id}
                className={`daily-card ${solved ? 'daily-card--solved' : ''}`}
              >
                <div className="daily-card-top">
                  <span className="schema-pill">
                    {index + 1}. {schema.shortTitle}
                  </span>
                  <span className={difficultyBadgeClass(ex.difficulty)}>{ex.difficulty}</span>
                </div>

                <h3 className="daily-card-title">{ex.title}</h3>
                <p className="daily-card-source">{ex.source}</p>

                <ul className="topic-list" role="list">
                  {ex.topics.slice(0, 3).map((t) => (
                    <li key={t} className="topic-tag">
                      {t}
                    </li>
                  ))}
                </ul>

                <div className="daily-card-footer">
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: solved ? 'var(--success)' : 'var(--text-secondary)',
                    }}
                  >
                    {solved ? (
                      <>
                        <CheckCircle2 size={15} aria-hidden="true" />
                        Gelöst
                      </>
                    ) : (
                      <>
                        <Circle size={15} aria-hidden="true" />
                        Offen
                      </>
                    )}
                  </span>

                  <button
                    type="button"
                    className={`btn btn-sm ${solved ? '' : 'btn-primary'}`}
                    onClick={() => onStartExercise(ex.id, dailyPlan, 'Tages-Training')}
                  >
                    {solved ? 'Nochmal üben' : 'Üben'}
                    <ArrowRight size={14} aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  // CATALOG MODE: All 8 schemas & 54 exercises with filters
  const filteredSchemas = ALL_SCHEMAS.filter(
    (s) => selectedSchema === 'all' || s.id === selectedSchema
  );

  return (
    <div>
      <section className="hero-card" aria-labelledby="main-content">
        <div className="hero-copy">
          <div className="hero-eyebrow">Themen- &amp; Schema-Katalog</div>
          <h1 id="main-content" tabIndex={-1} className="hero-title">
            Alle 8 Datenbank-Schemas &amp; {ALL_EXERCISES.length} Übungsaufgaben
          </h1>
          <p className="hero-desc">
            Wähle gezielt ein Schema aus den Übungsblättern oder filtere nach Schwierigkeitsgrad und
            SQL-Konzept (z. B. Allquantor, WITH RECURSIVE, Division, Window Functions).
          </p>
        </div>
      </section>

      <div className="filter-bar" role="search" aria-label="Aufgaben filtern">
        <div className="filter-group">
          <label htmlFor="filter-schema">Schema:</label>
          <select
            id="filter-schema"
            className="filter-select"
            value={selectedSchema}
            onChange={(e) => setSelectedSchema(e.target.value as SchemaId | 'all')}
          >
            <option value="all">Alle 8 Schemas</option>
            {ALL_SCHEMAS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filter-difficulty">Schwierigkeit:</label>
          <select
            id="filter-difficulty"
            className="filter-select"
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value as Difficulty | 'all')}
          >
            <option value="all">Alle Stufen</option>
            <option value="Basis">Basis</option>
            <option value="Mittel">Mittel</option>
            <option value="Klausurniveau">Klausurniveau</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filter-topic">SQL-Thema:</label>
          <select
            id="filter-topic"
            className="filter-select"
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
          >
            <option value="all">Alle Themen</option>
            {allTopics.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="schema-catalog">
        {filteredSchemas.map((schema) => {
          const allForSchema = getExercisesForSchema(schema.id);
          const filtered = allForSchema.filter((ex) => {
            const matchDiff =
              selectedDifficulty === 'all' || ex.difficulty === selectedDifficulty;
            const matchTopic = selectedTopic === 'all' || ex.topics.includes(selectedTopic);
            return matchDiff && matchTopic;
          });

          if (filtered.length === 0) return null;
          const solvedCount = allForSchema.filter((ex) => Boolean(solvedIds[ex.id])).length;

          return (
            <article key={schema.id} className="schema-card">
              <div className="schema-card-head">
                <div>
                  <h2 className="schema-card-title">{schema.title}</h2>
                  <div className="schema-card-sheets">{schema.sheets}</div>
                </div>
                <span className="stat-chip">
                  {solvedCount}/{allForSchema.length}
                </span>
              </div>

              <p className="schema-card-summary">{schema.summary}</p>

              <ul className="exercise-mini-list" role="list">
                {filtered.map((ex) => {
                  const solved = Boolean(solvedIds[ex.id]);
                  return (
                    <li key={ex.id}>
                      <button
                        type="button"
                        className="exercise-mini-btn"
                        onClick={() =>
                          onStartExercise(ex.id, filtered, `${schema.shortTitle} (Katalog)`)
                        }
                      >
                        <span className="exercise-mini-left">
                          {solved ? (
                            <CheckCircle2
                              size={15}
                              style={{ color: 'var(--success)', flexShrink: 0 }}
                              aria-hidden="true"
                            />
                          ) : (
                            <Circle
                              size={15}
                              style={{ color: 'var(--text-muted)', flexShrink: 0 }}
                              aria-hidden="true"
                            />
                          )}
                          <span className="exercise-mini-name">{ex.title}</span>
                        </span>
                        <span className={difficultyBadgeClass(ex.difficulty)}>
                          {ex.difficulty}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </article>
          );
        })}
      </div>
    </div>
  );
}
