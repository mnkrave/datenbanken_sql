import { metric } from '@vercel/functions';
import { authenticateRequest } from './_lib/auth.js';
import { ensureSchema, getSql } from './_lib/db.js';

interface ProgressPayload {
  solvedIds: Record<string, string>;
  drafts: Record<string, string>;
  activeDays: string[];
  completedDailyDates: string[];
  dailySession: string[] | null;
}

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_SQL_LENGTH = 20_000;

function isValidDateKey(val: unknown): val is string {
  return typeof val === 'string' && DATE_KEY_RE.test(val);
}

function isValidId(val: unknown): val is string {
  return typeof val === 'string' && val.length > 0 && val.length <= 120;
}

async function fetchUserProgress(
  userId: string,
  dateKey?: string | null
): Promise<ProgressPayload> {
  const sql = getSql();

  const [progressRows, activityRows, sessionRows] = await Promise.all([
    sql`
      SELECT exercise_id, solved_date, last_sql
      FROM user_exercise_progress
      WHERE user_id = ${userId}
    `,
    sql`
      SELECT date_key, daily_completed
      FROM user_daily_activity
      WHERE user_id = ${userId}
      ORDER BY date_key ASC
    `,
    dateKey && isValidDateKey(dateKey)
      ? sql`
          SELECT exercise_ids
          FROM user_daily_sessions
          WHERE user_id = ${userId} AND date_key = ${dateKey}
          LIMIT 1
        `
      : Promise.resolve([]),
  ]);

  const solvedIds: Record<string, string> = {};
  const drafts: Record<string, string> = {};

  for (const row of progressRows) {
    const exId = String(row.exercise_id);
    if (typeof row.solved_date === 'string' && row.solved_date.length > 0) {
      solvedIds[exId] = row.solved_date;
    }
    if (typeof row.last_sql === 'string' && row.last_sql.length > 0) {
      drafts[exId] = row.last_sql;
    }
  }

  const activeDays: string[] = [];
  const completedDailyDates: string[] = [];

  for (const row of activityRows) {
    const dk = String(row.date_key);
    activeDays.push(dk);
    if (row.daily_completed === true) {
      completedDailyDates.push(dk);
    }
  }

  let dailySession: string[] | null = null;
  if (sessionRows.length > 0 && Array.isArray(sessionRows[0].exercise_ids)) {
    dailySession = sessionRows[0].exercise_ids.filter((x: unknown): x is string =>
      isValidId(x)
    );
  }

  return {
    solvedIds,
    drafts,
    activeDays,
    completedDailyDates,
    dailySession,
  };
}

export async function GET(request: Request): Promise<Response> {
  const startedAt = performance.now();
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      metric('sql_trainer.progress.requests', 1, { method: 'GET', outcome: 'unauthorized' });
      return Response.json({ error: 'Nicht angemeldet' }, { status: 401 });
    }

    await ensureSchema();
    const url = new URL(request.url);
    const dateKey = url.searchParams.get('date');
    const data = await fetchUserProgress(auth.userId, dateKey);

    metric('sql_trainer.progress.requests', 1, { method: 'GET', outcome: 'success' });
    return Response.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('[api/progress GET] error:', err);
    metric('sql_trainer.progress.requests', 1, { method: 'GET', outcome: 'error' });
    return Response.json(
      { error: 'Fortschritt konnte nicht geladen werden.' },
      { status: 500 }
    );
  } finally {
    metric('sql_trainer.progress.duration_ms', performance.now() - startedAt, {
      method: 'GET',
    });
  }
}

export async function POST(request: Request): Promise<Response> {
  const startedAt = performance.now();
  let action = 'unknown';

  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      metric('sql_trainer.progress.requests', 1, { method: 'POST', outcome: 'unauthorized' });
      return Response.json({ error: 'Nicht angemeldet' }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body.action !== 'string') {
      metric('sql_trainer.progress.requests', 1, { method: 'POST', outcome: 'bad_request' });
      return Response.json({ error: 'Ungültige Anfrage' }, { status: 400 });
    }

    action = body.action;
    await ensureSchema();
    const sql = getSql();
    const { userId } = auth;

    if (action === 'solve') {
      const { exerciseId, schemaId, dateKey, sqlText, dailyCompleted } = body;
      if (!isValidId(exerciseId) || !isValidDateKey(dateKey)) {
        return Response.json(
          { error: 'Ungültige exerciseId oder dateKey' },
          { status: 400 }
        );
      }
      const safeSchemaId = isValidId(schemaId) ? schemaId : null;
      const safeSql =
        typeof sqlText === 'string' ? sqlText.slice(0, MAX_SQL_LENGTH) : null;
      const isDailyDone = dailyCompleted === true;

      await sql`
        INSERT INTO user_exercise_progress (
          user_id, exercise_id, schema_id, solved_date, solved_at, attempts, last_sql, updated_at
        )
        VALUES (
          ${userId}, ${exerciseId}, ${safeSchemaId}, ${dateKey}, NOW(), 1, ${safeSql}, NOW()
        )
        ON CONFLICT (user_id, exercise_id) DO UPDATE SET
          schema_id = COALESCE(EXCLUDED.schema_id, user_exercise_progress.schema_id),
          solved_date = EXCLUDED.solved_date,
          solved_at = NOW(),
          attempts = user_exercise_progress.attempts + 1,
          last_sql = COALESCE(EXCLUDED.last_sql, user_exercise_progress.last_sql),
          updated_at = NOW()
      `;

      await sql`
        INSERT INTO user_daily_activity (
          user_id, date_key, solved_count, daily_completed, updated_at
        )
        VALUES (${userId}, ${dateKey}, 1, ${isDailyDone}, NOW())
        ON CONFLICT (user_id, date_key) DO UPDATE SET
          solved_count = user_daily_activity.solved_count + 1,
          daily_completed = user_daily_activity.daily_completed OR EXCLUDED.daily_completed,
          updated_at = NOW()
      `;

      metric('sql_trainer.progress.requests', 1, {
        method: 'POST',
        action: 'solve',
        outcome: 'success',
      });
      return Response.json({ ok: true });
    }

    if (action === 'draft') {
      const { exerciseId, schemaId, sqlText } = body;
      if (!isValidId(exerciseId) || typeof sqlText !== 'string') {
        return Response.json({ error: 'Ungültiger Entwurf' }, { status: 400 });
      }
      const safeSchemaId = isValidId(schemaId) ? schemaId : null;
      const safeSql = sqlText.slice(0, MAX_SQL_LENGTH);

      await sql`
        INSERT INTO user_exercise_progress (
          user_id, exercise_id, schema_id, last_sql, updated_at
        )
        VALUES (${userId}, ${exerciseId}, ${safeSchemaId}, ${safeSql}, NOW())
        ON CONFLICT (user_id, exercise_id) DO UPDATE SET
          schema_id = COALESCE(EXCLUDED.schema_id, user_exercise_progress.schema_id),
          last_sql = EXCLUDED.last_sql,
          updated_at = NOW()
      `;

      metric('sql_trainer.progress.requests', 1, {
        method: 'POST',
        action: 'draft',
        outcome: 'success',
      });
      return Response.json({ ok: true });
    }

    if (action === 'ensure_daily_session') {
      const { dateKey, exerciseIds } = body;
      if (!isValidDateKey(dateKey) || !Array.isArray(exerciseIds)) {
        return Response.json({ error: 'Ungültige Tages-Session' }, { status: 400 });
      }
      const validIds = exerciseIds.filter((id): id is string => isValidId(id)).slice(0, 20);
      if (validIds.length === 0) {
        return Response.json({ error: 'Leere Tages-Session' }, { status: 400 });
      }

      await sql`
        INSERT INTO user_daily_sessions (user_id, date_key, exercise_ids)
        VALUES (${userId}, ${dateKey}, ${JSON.stringify(validIds)}::jsonb)
        ON CONFLICT (user_id, date_key) DO NOTHING
      `;

      const rows = await sql`
        SELECT exercise_ids
        FROM user_daily_sessions
        WHERE user_id = ${userId} AND date_key = ${dateKey}
        LIMIT 1
      `;

      const frozenIds =
        rows.length > 0 && Array.isArray(rows[0].exercise_ids)
          ? rows[0].exercise_ids.filter((x: unknown): x is string => isValidId(x))
          : validIds;

      metric('sql_trainer.progress.requests', 1, {
        method: 'POST',
        action: 'ensure_daily_session',
        outcome: 'success',
      });
      return Response.json({ dailySession: frozenIds });
    }

    if (action === 'merge_local') {
      const rawSolved =
        body.solvedIds && typeof body.solvedIds === 'object'
          ? (body.solvedIds as Record<string, unknown>)
          : {};
      const rawDrafts =
        body.drafts && typeof body.drafts === 'object'
          ? (body.drafts as Record<string, unknown>)
          : {};
      const rawActiveDays = Array.isArray(body.activeDays) ? body.activeDays : [];
      const rawCompletedDates = Array.isArray(body.completedDailyDates)
        ? body.completedDailyDates
        : [];
      const todayKey = isValidDateKey(body.todayKey) ? body.todayKey : null;
      const todayExerciseIds = Array.isArray(body.todayExerciseIds)
        ? body.todayExerciseIds.filter((id): id is string => isValidId(id)).slice(0, 20)
        : [];

      const allExerciseIds = new Set<string>([
        ...Object.keys(rawSolved).filter(isValidId),
        ...Object.keys(rawDrafts).filter(isValidId),
      ]);

      for (const exId of allExerciseIds) {
        const solvedDate = isValidDateKey(rawSolved[exId]) ? (rawSolved[exId] as string) : null;
        const draftSql =
          typeof rawDrafts[exId] === 'string'
            ? (rawDrafts[exId] as string).slice(0, MAX_SQL_LENGTH)
            : null;
        if (!solvedDate && !draftSql) continue;

        await sql`
          INSERT INTO user_exercise_progress (
            user_id, exercise_id, solved_date, solved_at, attempts, last_sql, updated_at
          )
          VALUES (
            ${userId},
            ${exId},
            ${solvedDate},
            CASE WHEN ${Boolean(solvedDate)} THEN NOW() ELSE NULL END,
            ${solvedDate ? 1 : 0},
            ${draftSql},
            NOW()
          )
          ON CONFLICT (user_id, exercise_id) DO UPDATE SET
            solved_date = COALESCE(user_exercise_progress.solved_date, EXCLUDED.solved_date),
            solved_at = COALESCE(user_exercise_progress.solved_at, EXCLUDED.solved_at),
            last_sql = COALESCE(NULLIF(user_exercise_progress.last_sql, ''), EXCLUDED.last_sql),
            updated_at = NOW()
        `;
      }

      const completedSet = new Set(rawCompletedDates.filter(isValidDateKey));
      const allDays = new Set<string>([
        ...rawActiveDays.filter(isValidDateKey),
        ...completedSet,
      ]);

      for (const dk of allDays) {
        const isDone = completedSet.has(dk);
        await sql`
          INSERT INTO user_daily_activity (
            user_id, date_key, solved_count, daily_completed, updated_at
          )
          VALUES (${userId}, ${dk}, 1, ${isDone}, NOW())
          ON CONFLICT (user_id, date_key) DO UPDATE SET
            daily_completed = user_daily_activity.daily_completed OR EXCLUDED.daily_completed,
            updated_at = NOW()
        `;
      }

      if (todayKey && todayExerciseIds.length > 0) {
        await sql`
          INSERT INTO user_daily_sessions (user_id, date_key, exercise_ids)
          VALUES (${userId}, ${todayKey}, ${JSON.stringify(todayExerciseIds)}::jsonb)
          ON CONFLICT (user_id, date_key) DO NOTHING
        `;
      }

      const merged = await fetchUserProgress(userId, todayKey);
      metric('sql_trainer.progress.requests', 1, {
        method: 'POST',
        action: 'merge_local',
        outcome: 'success',
      });
      return Response.json(merged, {
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    metric('sql_trainer.progress.requests', 1, {
      method: 'POST',
      action: 'invalid',
      outcome: 'bad_request',
    });
    return Response.json({ error: `Unbekannte Aktion: ${action}` }, { status: 400 });
  } catch (err) {
    console.error(`[api/progress POST ${action}] error:`, err);
    metric('sql_trainer.progress.requests', 1, { method: 'POST', outcome: 'error' });
    return Response.json(
      { error: 'Fortschritt konnte nicht gespeichert werden.' },
      { status: 500 }
    );
  } finally {
    metric('sql_trainer.progress.duration_ms', performance.now() - startedAt, {
      method: 'POST',
    });
  }
}

export async function DELETE(request: Request): Promise<Response> {
  const startedAt = performance.now();
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      metric('sql_trainer.progress.requests', 1, { method: 'DELETE', outcome: 'unauthorized' });
      return Response.json({ error: 'Nicht angemeldet' }, { status: 401 });
    }

    await ensureSchema();
    const sql = getSql();
    const { userId } = auth;

    await Promise.all([
      sql`DELETE FROM user_exercise_progress WHERE user_id = ${userId}`,
      sql`DELETE FROM user_daily_activity WHERE user_id = ${userId}`,
      sql`DELETE FROM user_daily_sessions WHERE user_id = ${userId}`,
    ]);

    metric('sql_trainer.progress.requests', 1, { method: 'DELETE', outcome: 'success' });
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[api/progress DELETE] error:', err);
    metric('sql_trainer.progress.requests', 1, { method: 'DELETE', outcome: 'error' });
    return Response.json(
      { error: 'Fortschritt konnte nicht zurückgesetzt werden.' },
      { status: 500 }
    );
  } finally {
    metric('sql_trainer.progress.duration_ms', performance.now() - startedAt, {
      method: 'DELETE',
    });
  }
}
