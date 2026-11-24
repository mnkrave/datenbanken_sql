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
const SAFE_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$/;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const ALLOWED_ACTIONS = new Set(['solve', 'draft', 'ensure_daily_session', 'merge_local']);

const MAX_BODY_BYTES = 512 * 1024;
const MAX_SQL_LENGTH = 20_000;
const MAX_MERGE_EXERCISES = 300;
const MAX_MERGE_DAYS = 1000;
const MAX_RAW_ENTRIES = 1500;

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  if (typeof val !== 'object' || val === null || Array.isArray(val)) return false;
  const proto = Object.getPrototypeOf(val);
  return proto === Object.prototype || proto === null;
}

function isValidDateKey(val: unknown): val is string {
  if (typeof val !== 'string' || !DATE_KEY_RE.test(val)) return false;
  const [y, m, d] = val.split('-').map(Number);
  if (y < 2020 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

function isValidId(val: unknown): val is string {
  return typeof val === 'string' && SAFE_ID_RE.test(val) && !FORBIDDEN_KEYS.has(val);
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
    if (!isValidId(exId)) continue;
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
      return jsonResponse({ error: 'Nicht angemeldet' }, 401);
    }

    await ensureSchema();
    const url = new URL(request.url);
    const dateKey = url.searchParams.get('date');
    const data = await fetchUserProgress(auth.userId, dateKey);

    metric('sql_trainer.progress.requests', 1, { method: 'GET', outcome: 'success' });
    return jsonResponse(data, 200);
  } catch (err) {
    console.error('[api/progress GET] error:', err);
    metric('sql_trainer.progress.requests', 1, { method: 'GET', outcome: 'error' });
    return jsonResponse(
      { error: 'Fortschritt konnte nicht geladen werden.' },
      500
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
      return jsonResponse({ error: 'Nicht angemeldet' }, 401);
    }

    const contentType = (request.headers.get('content-type') ?? '').trim().toLowerCase();
    if (!contentType.startsWith('application/json')) {
      metric('sql_trainer.progress.requests', 1, {
        method: 'POST',
        outcome: 'unsupported_media_type',
      });
      return jsonResponse({ error: 'Nicht unterstützter Content-Type' }, 415);
    }

    const contentLengthHeader = request.headers.get('content-length');
    if (contentLengthHeader !== null) {
      const contentLength = Number(contentLengthHeader);
      if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
        metric('sql_trainer.progress.requests', 1, {
          method: 'POST',
          outcome: 'payload_too_large',
        });
        return jsonResponse({ error: 'Anfrage zu groß' }, 413);
      }
    }

    let rawText: string;
    try {
      rawText = await request.text();
    } catch {
      metric('sql_trainer.progress.requests', 1, { method: 'POST', outcome: 'bad_request' });
      return jsonResponse({ error: 'Ungültige Anfrage' }, 400);
    }

    if (Buffer.byteLength(rawText, 'utf8') > MAX_BODY_BYTES) {
      metric('sql_trainer.progress.requests', 1, {
        method: 'POST',
        outcome: 'payload_too_large',
      });
      return jsonResponse({ error: 'Anfrage zu groß' }, 413);
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawText);
    } catch {
      metric('sql_trainer.progress.requests', 1, { method: 'POST', outcome: 'bad_request' });
      return jsonResponse({ error: 'Ungültige Anfrage' }, 400);
    }

    if (!isPlainObject(parsedBody) || typeof parsedBody.action !== 'string') {
      metric('sql_trainer.progress.requests', 1, { method: 'POST', outcome: 'bad_request' });
      return jsonResponse({ error: 'Ungültige Anfrage' }, 400);
    }

    if (!ALLOWED_ACTIONS.has(parsedBody.action)) {
      metric('sql_trainer.progress.requests', 1, {
        method: 'POST',
        action: 'invalid',
        outcome: 'bad_request',
      });
      return jsonResponse({ error: 'Unbekannte Aktion.' }, 400);
    }

    const body = parsedBody;
    action = parsedBody.action;
    await ensureSchema();
    const sql = getSql();
    const { userId } = auth;

    if (action === 'solve') {
      const { exerciseId, schemaId, dateKey, sqlText, dailyCompleted } = body;
      if (!isValidId(exerciseId) || !isValidDateKey(dateKey)) {
        return jsonResponse(
          { error: 'Ungültige exerciseId oder dateKey' },
          400
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
      return jsonResponse({ ok: true }, 200);
    }

    if (action === 'draft') {
      const { exerciseId, schemaId, sqlText } = body;
      if (!isValidId(exerciseId) || typeof sqlText !== 'string') {
        return jsonResponse({ error: 'Ungültiger Entwurf' }, 400);
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
      return jsonResponse({ ok: true }, 200);
    }

    if (action === 'ensure_daily_session') {
      const { dateKey, exerciseIds } = body;
      if (!isValidDateKey(dateKey) || !Array.isArray(exerciseIds)) {
        return jsonResponse({ error: 'Ungültige Tages-Session' }, 400);
      }
      const validIds = exerciseIds.filter((id): id is string => isValidId(id)).slice(0, 20);
      if (validIds.length === 0) {
        return jsonResponse({ error: 'Leere Tages-Session' }, 400);
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
      return jsonResponse({ dailySession: frozenIds }, 200);
    }

    if (action === 'merge_local') {
      if (
        (body.solvedIds !== undefined && !isPlainObject(body.solvedIds)) ||
        (body.drafts !== undefined && !isPlainObject(body.drafts)) ||
        (body.activeDays !== undefined && !Array.isArray(body.activeDays)) ||
        (body.completedDailyDates !== undefined && !Array.isArray(body.completedDailyDates))
      ) {
        return jsonResponse({ error: 'Ungültige Fortschrittsdaten' }, 400);
      }

      const rawSolved = isPlainObject(body.solvedIds) ? body.solvedIds : {};
      const rawDrafts = isPlainObject(body.drafts) ? body.drafts : {};
      const rawActiveDays = Array.isArray(body.activeDays) ? body.activeDays : [];
      const rawCompletedDates = Array.isArray(body.completedDailyDates)
        ? body.completedDailyDates
        : [];

      if (
        Object.keys(rawSolved).length > MAX_RAW_ENTRIES ||
        Object.keys(rawDrafts).length > MAX_RAW_ENTRIES ||
        rawActiveDays.length > MAX_RAW_ENTRIES ||
        rawCompletedDates.length > MAX_RAW_ENTRIES
      ) {
        return jsonResponse({ error: 'Zu viele Einträge in Fortschrittsdaten' }, 400);
      }

      const todayKey = isValidDateKey(body.todayKey) ? body.todayKey : null;
      const todayExerciseIds = Array.isArray(body.todayExerciseIds)
        ? body.todayExerciseIds.filter((id): id is string => isValidId(id)).slice(0, 20)
        : [];

      const allExerciseIds = Array.from(
        new Set<string>([
          ...Object.keys(rawSolved).filter(isValidId),
          ...Object.keys(rawDrafts).filter(isValidId),
        ])
      ).slice(0, MAX_MERGE_EXERCISES);

      for (const exId of allExerciseIds) {
        const rawSolvedVal = Object.prototype.hasOwnProperty.call(rawSolved, exId)
          ? rawSolved[exId]
          : undefined;
        const rawDraftVal = Object.prototype.hasOwnProperty.call(rawDrafts, exId)
          ? rawDrafts[exId]
          : undefined;
        const solvedDate = isValidDateKey(rawSolvedVal) ? rawSolvedVal : null;
        const draftSql =
          typeof rawDraftVal === 'string'
            ? rawDraftVal.slice(0, MAX_SQL_LENGTH)
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
      const allDays = Array.from(
        new Set<string>([
          ...rawActiveDays.filter(isValidDateKey),
          ...completedSet,
        ])
      ).slice(0, MAX_MERGE_DAYS);

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
      return jsonResponse(merged, 200);
    }

    metric('sql_trainer.progress.requests', 1, {
      method: 'POST',
      action: 'invalid',
      outcome: 'bad_request',
    });
    return jsonResponse({ error: 'Unbekannte Aktion.' }, 400);
  } catch (err) {
    console.error(`[api/progress POST ${action}] error:`, err);
    metric('sql_trainer.progress.requests', 1, { method: 'POST', outcome: 'error' });
    return jsonResponse(
      { error: 'Fortschritt konnte nicht gespeichert werden.' },
      500
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
      return jsonResponse({ error: 'Nicht angemeldet' }, 401);
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
    return jsonResponse({ ok: true }, 200);
  } catch (err) {
    console.error('[api/progress DELETE] error:', err);
    metric('sql_trainer.progress.requests', 1, { method: 'DELETE', outcome: 'error' });
    return jsonResponse(
      { error: 'Fortschritt konnte nicht zurückgesetzt werden.' },
      500
    );
  } finally {
    metric('sql_trainer.progress.duration_ms', performance.now() - startedAt, {
      method: 'DELETE',
    });
  }
}
