import { SCHEMA_MAP } from '../data/schemas';
import type { SchemaId, SqlErrorExcerpt, SqlErrorInfo } from '../types/sql';

export interface RawPgError {
  message: string;
  code?: string;
  position?: number; // 1-based offset into the user's ORIGINAL rawSql
  hint?: string;
  detail?: string;
}

const SQL_KEYWORDS = [
  'SELECT',
  'DISTINCT',
  'FROM',
  'WHERE',
  'JOIN',
  'INNER',
  'LEFT',
  'RIGHT',
  'FULL',
  'OUTER',
  'NATURAL',
  'CROSS',
  'ON',
  'AND',
  'OR',
  'NOT',
  'IN',
  'EXISTS',
  'ALL',
  'ANY',
  'GROUP',
  'BY',
  'HAVING',
  'ORDER',
  'ASC',
  'DESC',
  'UNION',
  'EXCEPT',
  'INTERSECT',
  'WITH',
  'RECURSIVE',
  'AS',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
  'IS',
  'NULL',
  'LIKE',
  'BETWEEN',
  'LIMIT',
  'OFFSET',
  'OVER',
  'PARTITION',
  'RANK',
  'COUNT',
  'SUM',
  'AVG',
  'MIN',
  'MAX',
  'ROUND',
  'CAST',
];

const UMLAUT_REPLACEMENTS: [RegExp, string][] = [
  [/ä/g, 'ae'],
  [/ö/g, 'oe'],
  [/ü/g, 'ue'],
  [/Ä/g, 'Ae'],
  [/Ö/g, 'Oe'],
  [/Ü/g, 'Ue'],
  [/ß/g, 'ss'],
];

function transliterateGerman(str: string): string {
  return UMLAUT_REPLACEMENTS.reduce((acc, [re, rep]) => acc.replace(re, rep), str);
}

function levenshtein(a: string, b: string): number {
  const s = a.toLowerCase();
  const t = b.toLowerCase();
  if (s === t) return 0;
  if (!s.length) return t.length;
  if (!t.length) return s.length;

  const prev = Array.from({ length: t.length + 1 }, (_, i) => i);
  const curr = new Array<number>(t.length + 1);

  for (let i = 1; i <= s.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= t.length; j++) prev[j] = curr[j];
  }
  return prev[t.length];
}

function findClosest(needle: string, candidates: string[], maxDist = 2): string | null {
  let best: string | null = null;
  let bestDist = maxDist + 1;
  const normalizedNeedle = transliterateGerman(needle);

  for (const cand of candidates) {
    if (cand.toLowerCase() === normalizedNeedle.toLowerCase()) {
      return cand;
    }
    const d = Math.min(levenshtein(needle, cand), levenshtein(normalizedNeedle, cand));
    if (d < bestDist) {
      bestDist = d;
      best = cand;
    }
  }
  return bestDist <= maxDist ? best : null;
}

function computePositionExcerpt(
  rawSql: string,
  pos1Based: number | undefined,
  nearToken?: string
): { line?: number; column?: number; excerpt?: SqlErrorExcerpt } {
  if (!pos1Based || pos1Based < 1 || !rawSql) return {};

  const zeroIdx = Math.min(pos1Based - 1, rawSql.length);
  const before = rawSql.slice(0, zeroIdx);
  const lines = rawSql.split('\n');
  const beforeLines = before.split('\n');
  const lineIdx = beforeLines.length - 1;
  const colIdx = beforeLines[lineIdx].length; // 0-based column on that line

  const lineText = lines[lineIdx] ?? '';
  let caretLength = 1;
  if (nearToken && nearToken.length > 0) {
    caretLength = Math.min(nearToken.length, Math.max(1, lineText.length - colIdx));
  } else {
    const tokenMatch = lineText.slice(colIdx).match(/^[A-Za-z0-9_]+/);
    if (tokenMatch) caretLength = tokenMatch[0].length;
  }

  return {
    line: lineIdx + 1,
    column: colIdx + 1,
    excerpt: {
      lineNumber: lineIdx + 1,
      lineText,
      caretOffset: colIdx,
      caretLength,
      prevLineNumber: lineIdx > 0 ? lineIdx : undefined,
      prevLineText: lineIdx > 0 ? lines[lineIdx - 1] : undefined,
    },
  };
}

function countUnbalanced(sql: string): { openParens: number; unclosedSingleQuote: boolean } {
  let inSingle = false;
  let inDouble = false;
  let parenDepth = 0;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = sql[i + 1];
    if (ch === '-' && next === '-' && !inSingle && !inDouble) {
      // Skip line comment
      while (i < sql.length && sql[i] !== '\n') i++;
      continue;
    }
    if (ch === "'" && !inDouble) {
      if (inSingle && next === "'") {
        i++; // Escaped quote ''
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
      if (ch === '(') parenDepth++;
      else if (ch === ')') parenDepth--;
    }
  }

  return { openParens: parenDepth, unclosedSingleQuote: inSingle };
}

function getAllSchemaColumns(schemaId: SchemaId): string[] {
  const schema = SCHEMA_MAP[schemaId];
  const cols = new Set<string>();
  for (const tbl of schema.tables) {
    for (const c of tbl.columns) {
      for (const part of c.name.split('/').map((s) => s.trim())) {
        if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(part)) cols.add(part);
      }
    }
  }
  return [...cols];
}

function diagnoseSyntaxError(
  rawSql: string,
  rawMessage: string,
  pos1Based: number | undefined
): { title: string; explanation: string; fixSuggestion?: string; nearToken?: string } {
  const nearMatch = rawMessage.match(/at or near "([^"]+)"/i);
  const nearToken = nearMatch?.[1];
  const atEnd = /at end of input/i.test(rawMessage);

  const beforeText = pos1Based ? rawSql.slice(0, Math.max(0, pos1Based - 1)).trimEnd() : rawSql;
  const { openParens, unclosedSingleQuote } = countUnbalanced(rawSql);

  // 1. Unclosed string literal
  if (unclosedSingleQuote || /unterminated quoted string/i.test(rawMessage)) {
    return {
      title: 'Nicht geschlossene Zeichenkette',
      explanation:
        'Ein Text-Literal mit einfachen Anführungszeichen (\'...\') wurde geöffnet, aber nicht wieder geschlossen.',
      fixSuggestion: 'Schließe jeden String mit einem zweiten einfachen Anführungszeichen, z. B. \'Bioethik\'.',
      nearToken,
    };
  }

  // 2. Relational Algebra backslash (\) typed instead of EXCEPT
  if (nearToken === '\\' || /\\\s*SELECT/i.test(rawSql)) {
    return {
      title: 'Mengendifferenz in SQL heißt EXCEPT (nicht \\)',
      explanation:
        'In der Relationalen Algebra schreibt man \\ für die Mengendifferenz — in SQL wird dafür das Schlüsselwort EXCEPT verwendet.',
      fixSuggestion: '(SELECT MatrNr FROM Studenten) EXCEPT (SELECT MatrNr FROM pruefen);',
      nearToken,
    };
  }

  // 3. Double equals == instead of =
  if (nearToken === '=' && /==/.test(rawSql)) {
    return {
      title: 'Ungültiger Vergleichsoperator „==“',
      explanation:
        'Anders als in Java/Python/C++ nutzt SQL für Gleichheit ein einfaches Gleichheitszeichen = (und für Ungleichheit <> oder !=).',
      fixSuggestion: 'Ersetze == durch = (z. B. WHERE Titel = \'Logik\').',
      nearToken: '==',
    };
  }

  // 4. Missing parentheses around a subquery! (VERY common cause of `syntax error at or near "SELECT"`)
  if (nearToken && nearToken.toUpperCase() === 'SELECT') {
    if (/(?:\b(?:IN|EXISTS|ALL|ANY|SOME|FROM|JOIN)|=|<>|!=|<|>|<=|>=)\s*$/i.test(beforeText)) {
      return {
        title: 'Klammern um Unterabfrage fehlen',
        explanation:
          'Eine Unterabfrage (Subquery) nach IN, NOT IN, EXISTS, =, >, ALL, ANY oder FROM muss in SQL immer in runden Klammern (...) stehen.',
        fixSuggestion:
          'Schreibe z. B.: WHERE MatrNr NOT IN (SELECT MatrNr FROM pruefen) statt ... NOT IN SELECT ...',
        nearToken,
      };
    }

    if (/\bWITH\b[\s\S]*\)\s*$/i.test(beforeText) && !/\bAS\s*\(\s*$/i.test(beforeText)) {
      return {
        title: 'Fehlendes AS (...) in der WITH-Klausel (CTE)',
        explanation:
          'Nach dem Namen einer Common Table Expression (WITH name ...) verlangt SQL das Schlüsselwort AS gefolgt von der geklammerten Abfrage.',
        fixSuggestion: 'WITH MeineCTE (Spalte1) AS (SELECT ... ) SELECT * FROM MeineCTE;',
        nearToken,
      };
    }

    if (/\bSELECT\b/i.test(beforeText) && !/\b(?:UNION|UNION\s+ALL|EXCEPT|INTERSECT)\s*$/i.test(beforeText)) {
      return {
        title: 'Unerwartetes zweites SELECT',
        explanation:
          'An dieser Stelle beginnt ein weiteres SELECT, ohne dass davor ein Mengenoperator (UNION, EXCEPT, INTERSECT), eine öffnende Klammer ( oder ein Semikolon ; steht.',
        fixSuggestion:
          'Wenn du zwei Abfragen kombinieren willst, verbinde sie mit EXCEPT, UNION oder INTERSECT (oder klammere eine Unterabfrage ein).',
        nearToken,
      };
    }
  }

  // 5. Trailing comma before FROM / WHERE / GROUP / ORDER
  if (
    nearToken &&
    /^(FROM|WHERE|GROUP|ORDER|HAVING|LIMIT)$/i.test(nearToken) &&
    /,\s*$/.test(beforeText)
  ) {
    return {
      title: `Überflüssiges Komma vor ${nearToken.toUpperCase()}`,
      explanation: `Direkt vor dem Schlüsselwort ${nearToken.toUpperCase()} steht ein Komma, das dort nicht erlaubt ist.`,
      fixSuggestion: `Entferne das letzte Komma direkt vor ${nearToken.toUpperCase()}.`,
      nearToken,
    };
  }

  // 6. GROUPBY / ORDERBY written without space or missing BY
  if (nearToken && /^(GROUPBY|ORDERBY)$/i.test(nearToken)) {
    const fixed = nearToken.toUpperCase() === 'GROUPBY' ? 'GROUP BY' : 'ORDER BY';
    return {
      title: `Leerzeichen fehlt: ${fixed}`,
      explanation: `In SQL wird ${fixed} als zwei getrennte Wörter mit Leerzeichen geschrieben.`,
      fixSuggestion: `Ersetze ${nearToken} durch ${fixed}.`,
      nearToken,
    };
  }

  if (/\b(?:GROUP|ORDER)\s*$/i.test(beforeText)) {
    return {
      title: 'Schlüsselwort BY fehlt nach GROUP / ORDER',
      explanation: 'Nach GROUP bzw. ORDER muss in SQL immer das Schlüsselwort BY folgen.',
      fixSuggestion: 'Schreibe GROUP BY Spalte bzw. ORDER BY Spalte ASC/DESC.',
      nearToken,
    };
  }

  // 7. Wrong clause order (e.g. WHERE after GROUP BY or ORDER BY)
  if (nearToken && nearToken.toUpperCase() === 'WHERE' && /\b(GROUP\s+BY|ORDER\s+BY|HAVING)\b/i.test(beforeText)) {
    return {
      title: 'Falsche Klausel-Reihenfolge: WHERE steht zu spät',
      explanation:
        'In SQL ist die Reihenfolge der Klauseln fest vorgeschrieben. WHERE muss immer VOR GROUP BY, HAVING und ORDER BY stehen.',
      fixSuggestion:
        'Richtige Reihenfolge: SELECT → FROM → JOIN → WHERE → GROUP BY → HAVING → ORDER BY',
      nearToken,
    };
  }

  // 8. Unbalanced parentheses
  if (openParens > 0) {
    return {
      title: `${openParens === 1 ? 'Eine schließende Klammer „)“ fehlt' : `${openParens} schließende Klammern „)“ fehlen`}`,
      explanation:
        'Du hast mehr öffnende Klammern ( als schließende Klammern ) in deiner Abfrage — häufig bei Unterabfragen oder Aggregatfunktionen wie COUNT(...).',
      fixSuggestion: 'Klicke auf „Formatieren“, um die Einrückung der Klammern sofort sichtbar zu machen.',
      nearToken,
    };
  }
  if (openParens < 0) {
    return {
      title: 'Zu viele schließende Klammern „)“',
      explanation: `Es gibt ${Math.abs(openParens)} schließende Klammer(n) ) ohne passende öffnende Klammer (.`,
      fixSuggestion: 'Prüfe deine Unterabfragen und Funktionsaufrufe auf eine überflüssige Klammer ).',
      nearToken,
    };
  }

  // 9. Keyword typo detection (e.g. SELEC, FORM, WEHRE, DISTINC, EXCPET)
  if (nearToken && /^[A-Za-z_]+$/.test(nearToken) && nearToken.length >= 3) {
    const upper = nearToken.toUpperCase();
    if (!SQL_KEYWORDS.includes(upper)) {
      const suggestion = findClosest(upper, SQL_KEYWORDS, upper.length <= 4 ? 1 : 2);
      if (suggestion) {
        return {
          title: `Tippfehler im Schlüsselwort „${nearToken}“?`,
          explanation: `PostgreSQL erkennt „${nearToken}“ an dieser Stelle nicht als gültiges SQL-Schlüsselwort.`,
          fixSuggestion: `Meintest du vielleicht ${suggestion}?`,
          nearToken,
        };
      }
    }
  }

  // 10. Truncated / incomplete query at end of input
  if (atEnd) {
    return {
      title: 'Abfrage bricht unerwartet ab',
      explanation:
        'Am Ende deiner SQL-Abfrage fehlt noch ein Teil (z. B. eine Bedingung nach WHERE/AND, eine Tabelle nach FROM/JOIN oder eine schließende Klammer).',
      fixSuggestion: 'Prüfe das Ende deiner Abfrage auf unvollständige Klauseln.',
    };
  }

  // Fallback for other syntax errors
  return {
    title: nearToken
      ? `Syntaxfehler bei „${nearToken}“`
      : 'SQL-Syntaxfehler',
    explanation: nearToken
      ? `An oder unmittelbar vor „${nearToken}“ stimmt die SQL-Grammatik nicht. Häufig fehlt direkt davor ein Komma, ein Operator (AND/OR/=), das Schlüsselwort FROM/ON oder eine Klammer.`
      : 'Die SQL-Grammatik ist an der markierten Stelle ungültig.',
    fixSuggestion:
      'Tipp: Prüfe das Wort direkt VOR der markierten Stelle — dort liegt bei SQL-Parsern oft die eigentliche Ursache. Nutze auch den Button „Formatieren“.',
    nearToken,
  };
}

export function diagnoseSqlError(
  rawSql: string,
  schemaId: SchemaId,
  physicalTables: string[],
  err: RawPgError
): SqlErrorInfo {
  const code = err.code;
  const msg = err.message;
  const schema = SCHEMA_MAP[schemaId];

  // 42601: syntax_error
  if (code === '42601' || /syntax error|unterminated quoted string/i.test(msg)) {
    const diag = diagnoseSyntaxError(rawSql, msg, err.position);
    const loc = computePositionExcerpt(rawSql, err.position, diag.nearToken);
    return {
      rawMessage: msg,
      sqlState: code,
      title: diag.title,
      explanation: diag.explanation,
      fixSuggestion: diag.fixSuggestion,
      ...loc,
    };
  }

  // 42P01: undefined_table
  if (code === '42P01' || /relation "([^"]+)" does not exist/i.test(msg)) {
    const match = msg.match(/relation "([^"]+)" does not exist/i);
    const badTable = match?.[1] ?? '';
    const loc = computePositionExcerpt(rawSql, err.position, badTable);
    const schemaTableNames =
      physicalTables.length > 0
        ? physicalTables
        : schema.tables.map((t) => t.name.split('/')[0].trim());
    const closest = badTable ? findClosest(badTable, schemaTableNames, 3) : null;
    const hasUmlaut = /[äöüßÄÖÜ]/.test(badTable);

    return {
      rawMessage: msg,
      sqlState: code,
      title: `Unbekannte Tabelle „${badTable}“`,
      explanation: hasUmlaut
        ? `Die Tabelle „${badTable}“ existiert nicht. In den SQL-Schemas werden Umlaute ausgeschrieben (ae/oe/ue, z. B. hoeren, pruefen, Wueste, Gewaesser).`
        : `Im Schema „${schema.shortTitle}“ gibt es keine Tabelle mit dem Namen „${badTable}“.`,
      fixSuggestion: closest
        ? `Meintest du die Tabelle ${closest}? Verfügbare Tabellen: ${schemaTableNames.slice(0, 8).join(', ')}${schemaTableNames.length > 8 ? ', …' : ''}.`
        : `Verfügbare Tabellen in diesem Schema: ${schemaTableNames.slice(0, 10).join(', ')}${schemaTableNames.length > 10 ? ', …' : ''}.`,
      ...loc,
    };
  }

  // 42703: undefined_column
  if (code === '42703' || /column "([^"]+)" does not exist/i.test(msg)) {
    const match = msg.match(/column (?:"([^"]+)"|([^\s]+)) does not exist/i);
    const badCol = match?.[1] ?? match?.[2] ?? '';
    const loc = computePositionExcerpt(rawSql, err.position, badCol);

    // Check if user put double quotes around a string literal in rawSql!
    const usedDoubleQuotes =
      badCol.length > 0 && rawSql.includes(`"${badCol}"`);
    const pgHintMatch = err.hint?.match(/reference the column "([^"]+)"/i);
    const pgSuggestion = pgHintMatch?.[1];
    const localSuggestion = pgSuggestion ?? (badCol ? findClosest(badCol, getAllSchemaColumns(schemaId), 3) : null);

    if (usedDoubleQuotes && !pgSuggestion) {
      return {
        rawMessage: msg,
        sqlState: code,
        title: `Doppelte Anführungszeichen bei „"${badCol}"“`,
        explanation:
          'In Standard-SQL / PostgreSQL stehen Zeichenketten (Strings) immer in EINFACHEN Anführungszeichen (\'...\'). Doppelte Anführungszeichen ("...") bedeuten hingegen einen Spaltennamen!',
        fixSuggestion: `Ersetze "${badCol}" durch '${badCol}'.`,
        ...loc,
      };
    }

    const hasUmlaut = /[äöüßÄÖÜ]/.test(badCol);
    return {
      rawMessage: msg,
      sqlState: code,
      title: `Unbekannte Spalte „${badCol}“`,
      explanation: hasUmlaut
        ? `Die Spalte „${badCol}“ gibt es nicht — in SQL sind Spaltennamen ohne Umlaute geschrieben (z. B. Vorgaenger, Qualitaet, Flaeche, Hoehe).`
        : `Keine der Tabellen in deiner FROM-Klausel besitzt eine Spalte namens „${badCol}“.`,
      fixSuggestion: localSuggestion
        ? `Meintest du die Spalte ${localSuggestion}? (Prüfe auch, ob du die richtige Tabelle gejoint hast.)`
        : 'Prüfe die exakten Spaltennamen in der Schema-Erklärung links und ob die zugehörige Tabelle im FROM/JOIN steht.',
      ...loc,
    };
  }

  // 42803: grouping_error (aggregate in WHERE or missing GROUP BY column)
  if (code === '42803') {
    const loc = computePositionExcerpt(rawSql, err.position);
    if (/aggregate functions are not allowed in WHERE/i.test(msg)) {
      return {
        rawMessage: msg,
        sqlState: code,
        title: 'Aggregatfunktion in WHERE nicht erlaubt',
        explanation:
          'Funktionen wie COUNT(), SUM(), AVG(), MIN() oder MAX() dürfen in SQL nicht direkt in der WHERE-Klausel stehen, weil WHERE noch vor der Gruppierung ausgewertet wird.',
        fixSuggestion:
          'Nutze für Gruppen-Bedingungen HAVING nach GROUP BY (z. B. GROUP BY ... HAVING COUNT(*) > 1) oder für Extremwerte eine Unterabfrage (WHERE SWS = (SELECT MAX(SWS) FROM ...)).',
        ...loc,
      };
    }
    return {
      rawMessage: msg,
      sqlState: code,
      title: 'Spalte fehlt in GROUP BY',
      explanation:
        'Sobald du eine Aggregatfunktion (COUNT, SUM, AVG, MAX, MIN) mit normalen Spalten im SELECT kombinierst, muss jede nicht-aggregierte Spalte in GROUP BY stehen.',
      fixSuggestion:
        'Ergänze die genannte Spalte in deiner GROUP BY-Klausel oder wende eine Aggregatfunktion auf sie an.',
      ...loc,
    };
  }

  // 42702: ambiguous_column
  if (code === '42702' || /column reference "([^"]+)" is ambiguous/i.test(msg)) {
    const match = msg.match(/column reference "([^"]+)" is ambiguous/i);
    const col = match?.[1] ?? 'Spalte';
    const loc = computePositionExcerpt(rawSql, err.position, col);
    return {
      rawMessage: msg,
      sqlState: code,
      title: `Spalte „${col}“ ist mehrdeutig`,
      explanation: `Mehrere Tabellen in deiner FROM-/JOIN-Klausel besitzen eine Spalte namens „${col}“. PostgreSQL weiß nicht, welche gemeint ist.`,
      fixSuggestion: `Stelle den Tabellen-Alias voran, z. B. s.${col} oder r.${col}.`,
      ...loc,
    };
  }

  // 21000: cardinality_violation (scalar subquery returns > 1 row)
  if (code === '21000' || /more than one row returned by a subquery/i.test(msg)) {
    return {
      rawMessage: msg,
      sqlState: code,
      title: 'Unterabfrage liefert mehr als eine Zeile (Klausurfalle!)',
      explanation:
        'Ein einfacher Vergleich (=, <, >) mit einer Unterabfrage erwartet genau EINEN einzelnen Wert. Deine Unterabfrage gibt aber mehrere Zeilen zurück.',
      fixSuggestion:
        'Verwende IN, = ANY, > ALL oder EXISTS statt = / > (oder aggregiere die Unterabfrage z. B. mit MAX(...)).',
    };
  }

  // 42601 / 42804 / 42883: UNION/EXCEPT column mismatch or type mismatch
  if (code === '42601' || /each (UNION|EXCEPT|INTERSECT) query must have the same number of columns/i.test(msg)) {
    return {
      rawMessage: msg,
      sqlState: code,
      title: 'Ungleiche Spaltenanzahl bei UNION / EXCEPT / INTERSECT',
      explanation:
        'Bei Mengenoperationen müssen beide SELECT-Anfragen exakt gleich viele Spalten mit kompatiblen Datentypen liefern.',
      fixSuggestion: 'Prüfe die Spaltenlisten beider SELECT-Teile.',
    };
  }

  if (code === '42883' || code === '22P02' || code === '42804') {
    const loc = computePositionExcerpt(rawSql, err.position);
    return {
      rawMessage: msg,
      sqlState: code,
      title: 'Datentyp-Konflikt oder unbekannter Operator',
      explanation:
        'Zwei Werte mit nicht kompatiblen Datentypen wurden verglichen oder kombiniert (z. B. Zahl mit Text, oder ein Spaltenname mit falscher Tabelle verknüpft).',
      fixSuggestion:
        'Prüfe die Join-Bedingung (Schlüssel ↔ Fremdschlüssel vom selben Typ) und ob Zahlen ohne Anführungszeichen sowie Texte in \'...\' geschrieben sind.',
      ...loc,
    };
  }

  // 57014: statement_timeout
  if (code === '57014' || /statement timeout/i.test(msg)) {
    return {
      rawMessage: msg,
      sqlState: code,
      title: 'Zeitüberschreitung (Endlosschleife in Rekursion?)',
      explanation:
        'Die Abfrage wurde nach 3 Sekunden abgebrochen. Bei WITH RECURSIVE passiert das typischerweise durch Zyklen im Graphen (z. B. Ainslie mit manager_id = employee_id oder das symmetrische benachbart-Netz).',
      fixSuggestion:
        'Verwende UNION statt UNION ALL (entfernt Duplikate/Zyklen automatisch) oder füge eine Abbruchbedingung wie manager_id <> employee_id bzw. ein Tiefenlimit hinzu.',
    };
  }

  // 42P01-style missing FROM-clause entry (e.g. wrong table alias)
  if (/missing FROM-clause entry for table "([^"]+)"/i.test(msg)) {
    const alias = msg.match(/for table "([^"]+)"/i)?.[1] ?? '';
    const loc = computePositionExcerpt(rawSql, err.position, alias);
    return {
      rawMessage: msg,
      sqlState: code,
      title: `Unbekannter Tabellen-Alias „${alias}“`,
      explanation: `Du greifst auf „${alias}.…“ zu, aber in deiner FROM-/JOIN-Klausel ist keine Tabelle bzw. kein Alias mit dem Namen „${alias}“ definiert.`,
      fixSuggestion: `Prüfe deine FROM- und JOIN-Aliase oder ergänze die fehlende Tabelle.`,
      ...loc,
    };
  }

  // Default fallback
  const loc = computePositionExcerpt(rawSql, err.position);
  return {
    rawMessage: msg,
    sqlState: code,
    title: 'SQL-Fehler',
    explanation: err.detail || 'PostgreSQL konnte diese Abfrage nicht ausführen.',
    fixSuggestion: err.hint,
    ...loc,
  };
}
