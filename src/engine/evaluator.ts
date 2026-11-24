import type { EvaluationResult, Exercise, QueryResult } from '../types/sql';
import { buildSqlErrorInfo, executeQuery } from './pgEngine';

const NUMERIC_RE = /^[+-]?(\d+(\.\d+)?|\.\d+)$/;

function normalizeForCompare(val: string | number | boolean | null): string {
  if (val === null) return '\u0000NULL';
  if (typeof val === 'boolean') return val ? 'B:true' : 'B:false';
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return `N:${val}`;
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

  const details: string[] = [];

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
    details.push(
      `${extraCount} unerwartete bzw. abweichende Zeile(n) sind in deinem Ergebnis enthalten.`
    );
  }

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

/**
 * Removes SQL line (-- ...) and block (/* ... *\/) comments while keeping single/double quoted literals intact.
 */
function stripSqlComments(sql: string): string {
  let out = '';
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (!inSingle && !inDouble) {
      if (ch === '-' && next === '-') {
        while (i < sql.length && sql[i] !== '\n') i++;
        if (i < sql.length) out += '\n';
        continue;
      }
      if (ch === '/' && next === '*') {
        i += 2;
        while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) i++;
        i++;
        out += ' ';
        continue;
      }
    }

    if (ch === "'" && !inDouble) {
      out += ch;
      if (inSingle && next === "'") {
        out += next;
        i++;
      } else {
        inSingle = !inSingle;
      }
      continue;
    }

    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      out += ch;
      continue;
    }

    out += ch;
  }

  return out;
}

function hasMultipleStatements(sql: string): boolean {
  const withoutComments = stripSqlComments(sql);
  // Blank out single-quoted and double-quoted literals so ';' inside strings does not split statements
  let cleaned = '';
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < withoutComments.length; i++) {
    const ch = withoutComments[i];
    const next = withoutComments[i + 1];
    if (ch === "'" && !inDouble) {
      if (inSingle && next === "'") {
        i++;
      } else {
        inSingle = !inSingle;
      }
      continue;
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }
    if (!inSingle && !inDouble) {
      cleaned += ch;
    }
  }

  const parts = cleaned
    .split(';')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return parts.length > 1;
}

export async function evaluateExercise(
  exercise: Exercise,
  userSql: string
): Promise<EvaluationResult> {
  const baseExecOpts =
    exercise.setupSql || exercise.verificationSql
      ? { setupSql: exercise.setupSql, verificationSql: exercise.verificationSql }
      : undefined;

  let expectedResult: QueryResult;
  try {
    expectedResult = await executeQuery(exercise.schemaId, exercise.solutionSql, baseExecOpts);
  } catch (err) {
    const errorInfo = await buildSqlErrorInfo(exercise.solutionSql, exercise.schemaId, err);
    return {
      status: 'error',
      headline: 'Interner Fehler bei der Musterlösung',
      details: [errorInfo.explanation],
      errorMessage: errorInfo.rawMessage,
      errorInfo,
    };
  }

  if (exercise.singleStatementOnly && hasMultipleStatements(userSql)) {
    return {
      status: 'wrong',
      expectedResult,
      headline: 'Nur eine einzige SQL-Anweisung erlaubt',
      details: [
        'Für diese Teilaufgabe dürfen alle betroffenen Datensätze nur mit genau EINEM SQL-Befehl bearbeitet werden (keine mehreren durch ; getrennten Anweisungen).',
      ],
    };
  }

  if (exercise.forbiddenSqlPattern) {
    const re = new RegExp(exercise.forbiddenSqlPattern, 'i');
    if (re.test(stripSqlComments(userSql))) {
      return {
        status: 'wrong',
        expectedResult,
        headline: 'Unzulässiges Konstrukt für diese Teilaufgabe',
        details: [
          exercise.forbiddenSqlMessage ??
            'Deine Abfrage verwendet ein Schlüsselwort, das in dieser Teilaufgabe ausdrücklich nicht erlaubt ist.',
        ],
      };
    }
  }

  let userResult: QueryResult;
  try {
    userResult = await executeQuery(exercise.schemaId, userSql, baseExecOpts);
  } catch (err) {
    const errorInfo = await buildSqlErrorInfo(userSql, exercise.schemaId, err);
    return {
      status: 'error',
      expectedResult,
      headline: errorInfo.line
        ? `${errorInfo.title} (Zeile ${errorInfo.line}, Spalte ${errorInfo.column})`
        : errorInfo.title,
      details: [],
      errorMessage: errorInfo.rawMessage,
      errorInfo,
    };
  }

  const verdict = compareResults(userResult, expectedResult, exercise);
  if (!verdict.ok) {
    return {
      status: 'wrong',
      userResult,
      expectedResult,
      headline: verdict.headline,
      details: verdict.details,
    };
  }

  if (exercise.extraTestCases && exercise.extraTestCases.length > 0) {
    for (const tc of exercise.extraTestCases) {
      const combinedSetup = [exercise.setupSql, tc.setupSql].filter(Boolean).join('\n');
      const tcOpts = {
        setupSql: combinedSetup,
        verificationSql: exercise.verificationSql,
      };

      const tcExpected = await executeQuery(exercise.schemaId, exercise.solutionSql, tcOpts);

      let tcUser: QueryResult;
      try {
        tcUser = await executeQuery(exercise.schemaId, userSql, tcOpts);
      } catch (err) {
        const errorInfo = await buildSqlErrorInfo(userSql, exercise.schemaId, err);
        return {
          status: 'wrong',
          userResult,
          expectedResult: tcExpected,
          headline: 'Besteht nicht alle Testfälle',
          details: [`Fehler im Zusatztest „${tc.label}“: ${errorInfo.title}`],
        };
      }

      const tcVerdict = compareResults(tcUser, tcExpected, exercise);
      if (!tcVerdict.ok) {
        return {
          status: 'wrong',
          userResult: tcUser,
          expectedResult: tcExpected,
          headline: 'Besteht nicht alle Testfälle',
          details: [`Fehlgeschlagener Testfall: ${tc.label}`, ...tcVerdict.details],
        };
      }
    }

    return {
      status: 'correct',
      userResult,
      expectedResult,
      headline: verdict.headline,
      details: [
        ...verdict.details,
        `Alle ${exercise.extraTestCases.length} zusätzlichen Testfälle bestanden (${exercise.extraTestCases
          .map((t) => t.label)
          .join('; ')}).`,
      ],
    };
  }

  return {
    status: 'correct',
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
    const userResult = await executeQuery(exercise.schemaId, userSql, {
      setupSql: exercise.setupSql,
      fallbackVerificationSql: exercise.verificationSql,
    });
    return {
      status: 'sandbox',
      userResult,
      headline: `Sandbox-Ausführung erfolgreich (${userResult.rowCount} Zeilen in ${userResult.durationMs} ms)`,
      details: ['Nur ausgeführt ohne Bewertung — klicke „Prüfen“, um deine Lösung abzugeben.'],
    };
  } catch (err) {
    const errorInfo = await buildSqlErrorInfo(userSql, exercise.schemaId, err);
    return {
      status: 'error',
      headline: errorInfo.line
        ? `${errorInfo.title} (Zeile ${errorInfo.line}, Spalte ${errorInfo.column})`
        : errorInfo.title,
      details: [],
      errorMessage: errorInfo.rawMessage,
      errorInfo,
    };
  }
}
