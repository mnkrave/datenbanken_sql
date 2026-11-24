import { PGlite } from '@electric-sql/pglite';
import { SCHEMA_MAP } from '../data/schemas';
import type { QueryResult, SchemaId, SqlErrorInfo } from '../types/sql';
import { diagnoseSqlError, type RawPgError } from './sqlErrorCoach';

const dbCache = new Map<SchemaId, Promise<PGlite>>();
const tableListCache = new Map<SchemaId, string[]>();

async function initSchemaDb(schemaId: SchemaId): Promise<PGlite> {
  const schema = SCHEMA_MAP[schemaId];
  const db = new PGlite();
  await db.exec(schema.seedSql);
  return db;
}

export function getSchemaDb(schemaId: SchemaId): Promise<PGlite> {
  let promise = dbCache.get(schemaId);
  if (!promise) {
    promise = initSchemaDb(schemaId).catch((err) => {
      dbCache.delete(schemaId);
      throw err;
    });
    dbCache.set(schemaId, promise);
  }
  return promise;
}

function normalizeCellValue(val: unknown): string | number | boolean | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'bigint') return Number(val);
  if (val instanceof Date) {
    return val.toISOString().slice(0, 10);
  }
  if (typeof val === 'number' || typeof val === 'boolean' || typeof val === 'string') {
    return val;
  }
  return String(val);
}

export class SqlExecutionError extends Error {
  readonly rawPg: RawPgError;
  constructor(rawPg: RawPgError) {
    super(rawPg.message);
    this.name = 'SqlExecutionError';
    this.rawPg = rawPg;
  }
}

function extractPgError(err: unknown, leadingOffset: number): RawPgError {
  if (err && typeof err === 'object') {
    const rec = err as Record<string, unknown>;
    const rawPos = rec.position !== undefined ? Number(rec.position) : NaN;
    return {
      message: typeof rec.message === 'string' ? rec.message : String(err),
      code: typeof rec.code === 'string' ? rec.code : undefined,
      position: Number.isFinite(rawPos) && rawPos > 0 ? rawPos + leadingOffset : undefined,
      hint: typeof rec.hint === 'string' ? rec.hint : undefined,
      detail: typeof rec.detail === 'string' ? rec.detail : undefined,
    };
  }
  return { message: String(err) };
}

export interface ExecuteOptions {
  setupSql?: string;
  verificationSql?: string;
  /** Nur ausführen, wenn userSql selbst keine Spalten liefert (für Sandbox bei DDL/DML) */
  fallbackVerificationSql?: string;
}

function createTxGuardToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Executes an arbitrary user or reference SQL query inside a rolled-back transaction
 * so even accidental DML/DDL cannot corrupt the practice database.
 */
export async function executeQuery(
  schemaId: SchemaId,
  rawSql: string,
  options?: ExecuteOptions
): Promise<QueryResult> {
  const trimmedStart = rawSql.trimStart();
  const leadingOffset = rawSql.length - trimmedStart.length;
  const cleaned = trimmedStart.replace(/;+\s*$/, '').trimEnd();

  if (!cleaned) {
    throw new SqlExecutionError({
      message: 'Leere Abfrage: Bitte gib zuerst eine SQL-Abfrage ein.',
    });
  }

  const db = await getSchemaDb(schemaId);
  const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const txGuard = createTxGuardToken();
  let resetInstance = false;

  await db.exec('BEGIN');
  try {
    // Protect against runaway WITH RECURSIVE cycles and detect transaction-escape attempts
    await db.exec(
      `SET LOCAL statement_timeout = '3000ms'; SET LOCAL app.tx_guard = '${txGuard}';`
    );

    if (options?.setupSql) {
      try {
        await db.exec(options.setupSql);
      } catch (err) {
        const pgErr = extractPgError(err, 0);
        throw new SqlExecutionError({
          message: `Setup-Fehler vor Ausführung: ${pgErr.message}`,
          code: pgErr.code,
          detail: pgErr.detail,
        });
      }
    }

    let results;
    try {
      results = await db.exec(cleaned, { rowMode: 'array' });
    } catch (err) {
      throw new SqlExecutionError(extractPgError(err, leadingOffset));
    }

    let selectResult =
      [...results].reverse().find((r) => r.fields && r.fields.length > 0) ??
      results[results.length - 1];

    const hasUserColumns = Boolean(selectResult?.fields && selectResult.fields.length > 0);
    const verSql =
      options?.verificationSql ?? (!hasUserColumns ? options?.fallbackVerificationSql : undefined);

    if (verSql) {
      try {
        const verResults = await db.exec(verSql, { rowMode: 'array' });
        selectResult =
          [...verResults].reverse().find((r) => r.fields && r.fields.length > 0) ??
          verResults[verResults.length - 1];
      } catch (err) {
        // Do NOT map verificationSql position offsets onto userSql
        const pgErr = extractPgError(err, 0);
        throw new SqlExecutionError({
          message: `Prüfabfrage nach deiner Anweisung fehlgeschlagen: ${pgErr.message}`,
          code: pgErr.code,
          detail: pgErr.detail,
        });
      }
    }

    const durationMs = Math.max(
      1,
      Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - started)
    );

    if (!selectResult || !selectResult.fields || selectResult.fields.length === 0) {
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        durationMs,
      };
    }

    const columns = selectResult.fields.map((f) => f.name);
    const rows = (selectResult.rows as unknown[][]).map((row) => row.map(normalizeCellValue));

    return {
      columns,
      rows,
      rowCount: rows.length,
      durationMs,
    };
  } finally {
    try {
      const guardRes = await db.query<{ guard: string | null }>(
        `SELECT current_setting('app.tx_guard', true) AS guard`
      );
      if (guardRes.rows[0]?.guard !== txGuard) {
        resetInstance = true;
      }
    } catch {
      // Aborted transaction (25P02) cannot run SELECT until ROLLBACK completes
    }

    if (resetInstance) {
      dbCache.delete(schemaId);
      tableListCache.delete(schemaId);
      db.close().catch(() => {});
    } else {
      try {
        await db.exec('ROLLBACK');
      } catch {
        dbCache.delete(schemaId);
        tableListCache.delete(schemaId);
        db.close().catch(() => {});
      }
    }
  }
}

export async function getPhysicalTables(schemaId: SchemaId): Promise<string[]> {
  const cached = tableListCache.get(schemaId);
  if (cached) return cached;

  const res = await executeQuery(
    schemaId,
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;`
  );
  const tables = res.rows.map((r) => String(r[0]));
  tableListCache.set(schemaId, tables);
  return tables;
}

export async function getTablePreview(
  schemaId: SchemaId,
  tableName: string,
  limit = 25
): Promise<QueryResult> {
  const validTables = await getPhysicalTables(schemaId);
  const match = validTables.find((t) => t.toLowerCase() === tableName.toLowerCase());
  if (!match) {
    throw new Error(`Tabelle "${tableName}" existiert in diesem Schema nicht.`);
  }
  const safeLimit = Math.min(Math.max(1, Math.trunc(Number(limit) || 25)), 500);
  const escapedIdent = match.replace(/"/g, '""');
  return executeQuery(schemaId, `SELECT * FROM "${escapedIdent}" LIMIT ${safeLimit};`);
}

export async function buildSqlErrorInfo(
  rawSql: string,
  schemaId: SchemaId,
  err: unknown
): Promise<SqlErrorInfo> {
  const rawPg: RawPgError =
    err instanceof SqlExecutionError
      ? err.rawPg
      : { message: err instanceof Error ? err.message : String(err) };

  let tables: string[] = [];
  try {
    tables = await getPhysicalTables(schemaId);
  } catch {
    tables = [];
  }

  return diagnoseSqlError(rawSql, schemaId, tables, rawPg);
}
