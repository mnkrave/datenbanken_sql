import { PGlite } from '@electric-sql/pglite';
import { SCHEMA_MAP } from '../data/schemas';
import type { QueryResult, SchemaId } from '../types/sql';

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

/**
 * Strip leading/trailing whitespace and trailing semicolon(s) for single-statement execution.
 * Also supports multi-statement scripts via exec() inside a rolled-back transaction.
 */
function cleanSql(raw: string): string {
  return raw.trim().replace(/;+\s*$/, '');
}

/**
 * Executes an arbitrary user or reference SQL query inside a rolled-back transaction
 * so even accidental DML/DDL cannot corrupt the practice database.
 */
export async function executeQuery(schemaId: SchemaId, rawSql: string): Promise<QueryResult> {
  const cleaned = cleanSql(rawSql);
  if (!cleaned) {
    throw new Error('Bitte gib zuerst eine SQL-Abfrage ein.');
  }

  const db = await getSchemaDb(schemaId);
  const started = typeof performance !== 'undefined' ? performance.now() : Date.now();

  await db.exec('BEGIN');
  try {
    // Set a conservative statement timeout (3 seconds) to protect against runaway WITH RECURSIVE cycles
    await db.exec("SET LOCAL statement_timeout = '3000ms'");

    const results = await db.exec(cleaned, { rowMode: 'array' });
    // Take the last statement that produced columns (allows e.g. CREATE TEMP VIEW ...; SELECT ...;)
    const selectResult =
      [...results].reverse().find((r) => r.fields && r.fields.length > 0) ?? results[results.length - 1];

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
      await db.exec('ROLLBACK');
    } catch {
      // Ignore rollback errors if connection already aborted
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
  // Validate against known physical table names to prevent injection
  const validTables = await getPhysicalTables(schemaId);
  const match = validTables.find((t) => t.toLowerCase() === tableName.toLowerCase());
  if (!match) {
    throw new Error(`Tabelle "${tableName}" existiert in diesem Schema nicht.`);
  }
  return executeQuery(schemaId, `SELECT * FROM "${match}" LIMIT ${limit};`);
}

export function formatSqlError(err: unknown): { message: string; hint?: string } {
  const raw = err instanceof Error ? err.message : String(err);
  let hint: string | undefined;

  if (/column ".*" does not exist/i.test(raw)) {
    hint =
      'Tipp: In Standard-SQL / PostgreSQL stehen Zeichenketten in einfachen Anführungszeichen (\'Text\'), nicht in doppelten ("Text") — doppelte Anführungszeichen bezeichnen Spaltennamen! Prüfe außerdem die exakte Schreibweise in der Schema-Übersicht.';
  } else if (/statement timeout/i.test(raw)) {
    hint =
      'Zeitüberschreitung (3s): Falls du WITH RECURSIVE nutzt, prüfe auf Endlosschleifen/Zyklen (z. B. UNION statt UNION ALL oder manager_id <> employee_id).';
  } else if (/must appear in the GROUP BY clause/i.test(raw)) {
    hint =
      'Tipp: Jede nicht-aggregierte Spalte im SELECT muss auch in der GROUP BY-Klausel aufgeführt werden (wie in Kap. 4 der Vorlesung besprochen).';
  } else if (/ambiguous/i.test(raw)) {
    hint =
      'Tipp: Eine Spalte (z. B. Name oder G_ID) kommt in mehreren gejointen Tabellen vor. Qualifiziere sie mit dem Tabellenalias (z. B. s.Name).';
  } else if (/syntax error/i.test(raw)) {
    hint = 'Prüfe SQL-Schlüsselwörter, Kommas zwischen Spalten und schließende Klammern.';
  }

  return { message: raw, hint };
}
