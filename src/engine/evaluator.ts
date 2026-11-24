import type { EvaluationResult, Exercise, QueryResult } from '../types/sql';
import { executeQuery, formatSqlError } from './pgEngine';

const NUMERIC_RE = /^[+-]?(\d+(\.\d+)?|\.\d+)$/;

function normalizeForCompare(val: string | number | boolean | null): string {
  if (val === null) return '\u0000NULL';
  if (typeof val === 'boolean') return val ? 'B:true' : 'B:false';
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return `N:${val}`;
    // Round to 4 decimal places to prevent floating-point noise
    const rounded = Math.abs(val) < 1e-9 ? 0 : Math.round(val * 10000) / 10000;
    return `N:${rounded}`;
  }
  const trimmed = val.trim();
  if (NUMERIC_RE.test(trimmed)) {
    const num = Number(trimmed);
    if (Number.isFinite(num)) {
      const rounded = Math.abs(num) < 1e-9 ? 0 : Math.round(num * 10000) / 10000;
      return `N:${rounded}`;
    }
  }
  return `S:${trimmed}`;
}

function serializeRow(row: (string | number | boolean | null)[]): string {
  return row.map(normalizeForCompare).join('\u0001');
}

function compareResults(
  user: QueryResult,
  expected: QueryResult,
  exercise: Exercise
): { ok: boolean; headline: string; details: string[] } {
  if (user.columns.length === 0) {
    return {
      ok: false,
      headline: 'Kein Abfrageergebnis erhalten',
      details: [
        'Deine SQL-Anweisung hat keine Ergebnistabelle zurückgegeben. Schreibe eine SELECT-Abfrage (ggf. mit WITH ... SELECT).',
      ],
    };
  }

  if (user.columns.length !== expected.columns.length) {
    return {
      ok: false,
      headline: 'Spaltenanzahl stimmt nicht',
      details: [
        `Erwartet: ${expected.columns.length} Spalte(n) (${exercise.expectedColumns.join(', ')}), erhalten: ${user.columns.length} Spalte(n) (${user.columns.join(', ')}).`,
      ],
    };
  }

  const userKeys = user.rows.map(serializeRow);
  const expectedKeys = expected.rows.map(serializeRow);

  // Check exact match according to orderMatters
  const userSorted = [...userKeys].sort();
  const expectedSorted = [...expectedKeys].sort();

  const sameMultiset =
    userSorted.length === expectedSorted.length &&
    userSorted.every((v, i) => v === expectedSorted[i]);

  if (sameMultiset) {
    if (!exercise.orderMatters) {
      return {
        ok: true,
        headline: 'Richtig gelöst!',
        details: [
          `Exakt ${expected.rowCount} Zeile(n) und ${expected.columns.length} Spalte(n) stimmen mit der Musterlösung überein (${user.durationMs} ms).`,
        ],
      };
    }

    const sameOrder = userKeys.every((v, i) => v === expectedKeys[i]);
    if (sameOrder) {
      return {
        ok: true,
        headline: 'Richtig gelöst!',
        details: [
          `Ergebnis und Sortierreihenfolge (${expected.rowCount} Zeilen) sind exakt korrekt (${user.durationMs} ms).`,
        ],
      };
    }

    return {
      ok: false,
      headline: 'Werte stimmen, aber die Sortierung weicht ab',
      details: [
        'Deine Abfrage liefert genau die richtigen Zeilen, jedoch in der falschen Reihenfolge. Prüfe deine ORDER BY-Klausel (ASC/DESC und sekundäre Sortierspalte).',
      ],
    };
  }

  // Diagnostic feedback when rows do not match
  const details: string[] = [];

  // Check if user just forgot DISTINCT
  const userUnique = [...new Set(userKeys)].sort();
  const expectedUnique = [...new Set(expectedKeys)].sort();
  const sameUniqueSet =
    userUnique.length === expectedUnique.length &&
    userUnique.every((v, i) => v === expectedUnique[i]);

  if (sameUniqueSet && userKeys.length > expectedKeys.length) {
    details.push(
      `Deine Abfrage enthält die richtigen Werte, aber mit Duplikaten (erhalten: ${user.rowCount} Zeilen, erwartet: ${expected.rowCount} Zeilen). Prüfe, ob SELECT DISTINCT fehlt (Klausurfalle Mengensemantik!).`
    );
    return {
      ok: false,
      headline: 'Duplikate im Ergebnis — fehlt DISTINCT?',
      details,
    };
  }

  if (user.rowCount !== expected.rowCount) {
    details.push(
      `Zeilenanzahl weicht ab: erwartet ${expected.rowCount} Zeile(n), erhalten ${user.rowCount} Zeile(n).`
    );
  }

  // Compute missing / extra counts
  const expectedMap = new Map<string, number>();
  for (const k of expectedKeys) expectedMap.set(k, (expectedMap.get(k) ?? 0) + 1);
  let extraCount = 0;
  for (const k of userKeys) {
    const rem = expectedMap.get(k) ?? 0;
    if (rem > 0) {
      expectedMap.set(k, rem - 1);
    } else {
      extraCount++;
    }
  }
  let missingCount = 0;
  for (const rem of expectedMap.values()) missingCount += rem;

  if (missingCount > 0) {
    details.push(`${missingCount} erwartete Zeile(n) fehlen in deinem Ergebnis.`);
  }
  if (extraCount > 0) {
    details.push(`${extraCount} unerwartete bzw. abweichende Zeile(n) sind in deinem Ergebnis enthalten.`);
  }

  // Check if columns might be swapped
  if (expected.columns.length === 2 && user.rowCount === expected.rowCount && user.rowCount > 0) {
    const swappedKeys = user.rows.map((r) => serializeRow([r[1], r[0]])).sort();
    if (swappedKeys.every((v, i) => v === expectedSorted[i])) {
      details.push(
        `Hinweis: Die beiden Spalten scheinen vertauscht zu sein! Erwartete Reihenfolge: ${exercise.expectedColumns.join(', ')}.`
      );
    }
  }

  return {
    ok: false,
    headline: 'Noch nicht richtig',
    details,
  };
}

export async function evaluateExercise(
  exercise: Exercise,
  userSql: string
): Promise<EvaluationResult> {
  let expectedResult: QueryResult;
  try {
    expectedResult = await executeQuery(exercise.schemaId, exercise.solutionSql);
  } catch (err) {
    const formatted = formatSqlError(err);
    return {
      status: 'error',
      headline: 'Interner Fehler bei der Musterlösung',
      details: [formatted.message],
      errorMessage: formatted.message,
    };
  }

  let userResult: QueryResult;
  try {
    userResult = await executeQuery(exercise.schemaId, userSql);
  } catch (err) {
    const formatted = formatSqlError(err);
    return {
      status: 'error',
      expectedResult,
      headline: 'SQL-Syntax- oder Laufzeitfehler',
      details: formatted.hint ? [formatted.hint] : [],
      errorMessage: formatted.message,
    };
  }

  const verdict = compareResults(userResult, expectedResult, exercise);
  return {
    status: verdict.ok ? 'correct' : 'wrong',
    userResult,
    expectedResult,
    headline: verdict.headline,
    details: verdict.details,
  };
}

export async function runSandboxQuery(
  exercise: Exercise,
  userSql: string
): Promise<EvaluationResult> {
  try {
    const userResult = await executeQuery(exercise.schemaId, userSql);
    return {
      status: 'sandbox',
      userResult,
      headline: `Sandbox-Ausführung erfolgreich (${userResult.rowCount} Zeilen in ${userResult.durationMs} ms)`,
      details: ['Nur ausgeführt ohne Bewertung — klicke „Prüfen“, um deine Lösung abzugeben.'],
    };
  } catch (err) {
    const formatted = formatSqlError(err);
    return {
      status: 'error',
      headline: 'SQL-Fehler in der Sandbox',
      details: formatted.hint ? [formatted.hint] : [],
      errorMessage: formatted.message,
    };
  }
}
