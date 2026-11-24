import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let cachedSql: NeonQueryFunction<false, false> | null = null;
let schemaReadyPromise: Promise<void> | null = null;

export function getSql(): NeonQueryFunction<false, false> {
  if (cachedSql) return cachedSql;

  const url =
    process.env.DATENBANKEN_DATABASE_URL ||
    process.env.DATENBANKEN_POSTGRES_URL ||
    process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      'Datenbank-Konfiguration fehlt (DATENBANKEN_DATABASE_URL / DATABASE_URL nicht gesetzt).'
    );
  }

  cachedSql = neon(url);
  return cachedSql;
}

/**
 * Idempotent, non-destructive schema initialization.
 * Progress is keyed by stable string slug `exercise_id` (never numeric indexes),
 * so adding new exercises in future releases never loses or shifts user progress.
 */
export function ensureSchema(): Promise<void> {
  if (!schemaReadyPromise) {
    const sql = getSql();
    schemaReadyPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS user_exercise_progress (
          user_id TEXT NOT NULL,
          exercise_id TEXT NOT NULL,
          schema_id TEXT,
          solved_date TEXT,
          solved_at TIMESTAMPTZ,
          attempts INTEGER NOT NULL DEFAULT 0,
          last_sql TEXT,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (user_id, exercise_id)
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS user_daily_activity (
          user_id TEXT NOT NULL,
          date_key TEXT NOT NULL,
          solved_count INTEGER NOT NULL DEFAULT 1,
          daily_completed BOOLEAN NOT NULL DEFAULT FALSE,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (user_id, date_key)
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS user_daily_sessions (
          user_id TEXT NOT NULL,
          date_key TEXT NOT NULL,
          exercise_ids JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (user_id, date_key)
        )
      `;
    })().catch((err) => {
      schemaReadyPromise = null;
      throw err;
    });
  }

  return schemaReadyPromise;
}
