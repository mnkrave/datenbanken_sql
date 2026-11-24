import type { Exercise, SchemaDef, WorksheetDef } from '../types/sql';

export const lrSemijoinSchema: SchemaDef = {
  id: 'lr_semijoin',
  title: 'Semi-Join & Duplikate (L / R)',
  shortTitle: 'L & R (Blatt 5)',
  sheets: 'Übungsblatt 5 (Aufg. 1)',
  summary:
    'Die beiden kompakten Beispielrelationen L(a, b, c) und R(c, d, e) aus Übungsblatt 5 Aufg. 1 zur präzisen Unterscheidung von INNER JOIN, DISTINCT, EXISTS, IN und Multi-Set-/Mengensemantik.',
  explanationBullets: [
    'L(a, b, c) enthält genau 3 Tupel: (a1, b1, c1), (a2, b2, c2), (a3, b3, c3).',
    'R(c, d, e) enthält 4 Tupel: (c1, d1, e1), (c1, d1, e2) sowie zweimal das identische Tupel (c3, d3, e3)!',
    'Aufgabe 1(a) lässt Sie die beiden Tabellen inkl. INSERT-Daten selbst anlegen; für 1(b)–1(j) sind L und R bereits mit diesen exakten Daten befüllt.',
  ],
  examNotes: [
    'Multi-Set-Semantik: Da R das Tupel (c3, d3, e3) zweimal als unterschiedliche physikalische Zeilen speichert, liefert SELECT R.* ... WHERE EXISTS (...) ohne DISTINCT ebenfalls 4 Zeilen!',
    'Ein JOIN (L INNER JOIN R) vervielfacht Tupel aus L, wenn es mehrere Join-Partner in R gibt; EXISTS prüft dagegen nur die Existenz mindestens eines Partners.',
  ],
  tables: [
    {
      name: 'L',
      description: 'Linke Relation (3 Tupel)',
      columns: [
        { name: 'a', type: 'CHAR(2)' },
        { name: 'b', type: 'CHAR(2)' },
        { name: 'c', type: 'CHAR(2)' },
      ],
    },
    {
      name: 'R',
      description: 'Rechte Relation (4 Tupel inkl. Duplikat c3,d3,e3)',
      columns: [
        { name: 'c', type: 'CHAR(2)' },
        { name: 'd', type: 'CHAR(2)' },
        { name: 'e', type: 'CHAR(2)' },
      ],
    },
  ],
  seedSql: `
    CREATE TABLE L (
      a CHAR(2) NOT NULL,
      b CHAR(2) NOT NULL,
      c CHAR(2) NOT NULL
    );

    CREATE TABLE R (
      c CHAR(2) NOT NULL,
      d CHAR(2) NOT NULL,
      e CHAR(2) NOT NULL
    );

    INSERT INTO L VALUES
      ('a1', 'b1', 'c1'),
      ('a2', 'b2', 'c2'),
      ('a3', 'b3', 'c3');

    INSERT INTO R VALUES
      ('c1', 'd1', 'e1'),
      ('c1', 'd1', 'e2'),
      ('c3', 'd3', 'e3'),
      ('c3', 'd3', 'e3');
  `,
};

export const fdRelationSchema: SchemaDef = {
  id: 'fd_relation',
  title: 'Relation R(A, B, C, D) · Funktionale Abhängigkeiten',
  shortTitle: 'FD-Prüfung (Blatt 7)',
  sheets: 'Übungsblatt 7 (Aufg. 2)',
  summary:
    'Die 4-attributige Beispielrelation R(A, B, C, D) mit 8 Tupeln aus Übungsblatt 7 Aufg. 2 zur Überprüfung funktionaler Abhängigkeiten A → B per SQL.',
  explanationBullets: [
    'Relation R(A, B, C, D) enthält 8 Tupel mit Werten a1–a4, b1–b2, c1–c5, d1–d4 (keine NULL-Werte).',
    'Auf dieser Basis-Ausprägung ist A → B erfüllt (zu jedem A-Wert gehört genau ein eindeutiger B-Wert).',
    'Bei der Überprüfung prüft das System Ihre Abfrage zusätzlich gegen ein eingespieltes Gegenbeispiel-Tupel, das A → B verletzt!',
  ],
  examNotes: [
    'Für eine gültige FD A → B darf es zu demselben A-Wert niemals zwei verschiedene B-Werte geben: HAVING COUNT(DISTINCT B) > 1.',
    'Vorsicht: HAVING COUNT(*) > 1 wäre FALSCH, da z. B. a1 mehrfach mit demselben Wert b1 vorkommt!',
  ],
  tables: [
    {
      name: 'R',
      description: 'Beispielrelation für FDs (8 Tupel aus Blatt 7 Aufg. 2a)',
      columns: [
        { name: 'A', type: 'VARCHAR(10)' },
        { name: 'B', type: 'VARCHAR(10)' },
        { name: 'C', type: 'VARCHAR(10)' },
        { name: 'D', type: 'VARCHAR(10)' },
      ],
    },
  ],
  seedSql: `
    CREATE TABLE R (
      A VARCHAR(10) NOT NULL,
      B VARCHAR(10) NOT NULL,
      C VARCHAR(10) NOT NULL,
      D VARCHAR(10) NOT NULL
    );

    INSERT INTO R VALUES
      ('a1', 'b1', 'c1', 'd1'),
      ('a1', 'b1', 'c2', 'd1'),
      ('a2', 'b2', 'c1', 'd2'),
      ('a2', 'b2', 'c2', 'd2'),
      ('a3', 'b2', 'c2', 'd3'),
      ('a4', 'b1', 'c2', 'd4'),
      ('a4', 'b1', 'c4', 'd4'),
      ('a4', 'b1', 'c5', 'd4');
  `,
};

export const SHEET_EXTRA_SCHEMAS: SchemaDef[] = [lrSemijoinSchema, fdRelationSchema];

export const SHEET_ONLY_EXERCISES: Exercise[] = [
  // ===========================================================================
  // ÜBUNGSBLATT 5 · AUFGABE 1 (a–j)
  // ===========================================================================
  {
    id: 'blatt05-1a-ddl-insert',
    schemaId: 'lr_semijoin',
    title: 'Tabellen L und R anlegen und mit Daten füllen',
    source: 'Übungsblatt 5 · Aufg. 1(a)',
    difficulty: 'Basis',
    topics: ['DDL', 'CREATE TABLE', 'INSERT INTO'],
    prompt:
      'Geben Sie die SQL-Statements an, um die beiden Relationen `L(a, b, c)` und `R(c, d, e)` anzulegen (`CHAR(2)` oder `VARCHAR`) und mit den 3 bzw. 4 Tupeln vom Übungsblatt zu füllen (Tupel in `L`: `(a1, b1, c1)`, `(a2, b2, c2)`, `(a3, b3, c3)`; in `R`: `(c1, d1, e1)`, `(c1, d1, e2)`, `(c3, d3, e3)`, `(c3, d3, e3)`). Hinweis: Bestehende Tabellen `L` und `R` werden vor dem Test automatisch zurückgesetzt.',
    expectedColumns: ['tabelle', 'sp1', 'sp2', 'sp3'],
    orderMatters: false,
    setupSql: 'DROP TABLE IF EXISTS L, R;',
    verificationSql: `SELECT 'L' AS tabelle, TRIM(a::text) AS sp1, TRIM(b::text) AS sp2, TRIM(c::text) AS sp3 FROM L
UNION ALL
SELECT 'R' AS tabelle, TRIM(c::text) AS sp1, TRIM(d::text) AS sp2, TRIM(e::text) AS sp3 FROM R;`,
    verificationNote: 'DDL & INSERT: prüft Tabellen L(a,b,c) mit 3 Tupeln und R(c,d,e) mit 4 Tupeln (inkl. Duplikat c3,d3,e3)',
    solutionSql: `CREATE TABLE L (
  a character(2),
  b character(2),
  c character(2)
);

CREATE TABLE R (
  c character(2),
  d character(2),
  e character(2)
);

INSERT INTO L VALUES
  ('a1', 'b1', 'c1'),
  ('a2', 'b2', 'c2'),
  ('a3', 'b3', 'c3');

INSERT INTO R VALUES
  ('c1', 'd1', 'e1'),
  ('c1', 'd1', 'e2'),
  ('c3', 'd3', 'e3'),
  ('c3', 'd3', 'e3');`,
    hints: [
      'Legen Sie zuerst beide Tabellen mit `CREATE TABLE L (...)` und `CREATE TABLE R (...)` an (z. B. Typ `CHAR(2)` oder `VARCHAR(10)`).',
      'Fügen Sie die 3 Tupel in `L` und die 4 Tupel in `R` (inkl. des doppelten Tupels `(\'c3\', \'d3\', \'e3\')`) per `INSERT INTO ... VALUES ...` ein — vergessen Sie das Semikolon `;` zwischen den Statements nicht!',
    ],
    solutionExplanation:
      'Exakte Musterlösung von Blatt 5 Aufg. 1(a). Beachten Sie, dass `R` ohne Primärschlüssel angelegt wird, damit das doppelte Tupel `(c3, d3, e3)` tatsächlich zweimal gespeichert werden kann.',
  },
  {
    id: 'blatt05-1b-l-semijoin-r-bag',
    schemaId: 'lr_semijoin',
    title: 'Join auf L ohne Duplikateliminierung',
    source: 'Übungsblatt 5 · Aufg. 1(b)',
    difficulty: 'Basis',
    topics: ['INNER JOIN', 'Multi-Set-Semantik'],
    prompt:
      'Formulieren Sie den Ausdruck für die Spalten von $L$ in SQL OHNE Duplikateliminierung (`L.*` mit Join über `L.c = R.c`).',
    formulaLatex: 'L \\ltimes_{L.c = R.c} R',
    expectedColumns: ['a', 'b', 'c'],
    orderMatters: false,
    solutionSql: `SELECT L.*
FROM L
INNER JOIN R ON L.c = R.c;`,
    alternativeSolutions: [`SELECT L.* FROM L, R WHERE L.c = R.c;`],
    hints: [
      'Projizieren Sie auf `L.*` und verbinden Sie `L` und `R` mit `INNER JOIN` über `L.c = R.c` (kein `DISTINCT`!).',
    ],
    solutionExplanation:
      'Da sowohl `c1` als auch `c3` zwei Joinpartner in `R` finden, taucht jedes passende `L`-Tupel zweimal im Ergebnis auf (4 Zeilen). Das zeigt den Unterschied zwischen `SELECT L.* FROM L JOIN R` und einem echten relationalen Semi-Join.',
  },
  {
    id: 'blatt05-1c-l-semijoin-r-set',
    schemaId: 'lr_semijoin',
    title: 'Join auf L mit Duplikateliminierung',
    source: 'Übungsblatt 5 · Aufg. 1(c)',
    difficulty: 'Basis',
    topics: ['INNER JOIN', 'DISTINCT'],
    prompt:
      'Formulieren Sie denselben Ausdruck auf den Spalten von $L$ in SQL MIT Duplikateliminierung.',
    formulaLatex: 'L \\ltimes_{L.c = R.c} R',
    expectedColumns: ['a', 'b', 'c'],
    orderMatters: false,
    requiresDistinct: true,
    solutionSql: `SELECT DISTINCT L.*
FROM L
INNER JOIN R ON L.c = R.c;`,
    alternativeSolutions: [`SELECT DISTINCT L.* FROM L, R WHERE L.c = R.c;`],
    hints: ['Ergänzen Sie `SELECT DISTINCT L.*` in der Join-Abfrage aus (b).'],
    solutionExplanation:
      'Durch `DISTINCT` bleibt jedes passende Tupel aus `L` nur noch einmal übrig → `(a1, b1, c1)` und `(a3, b3, c3)` (2 Zeilen).',
  },
  {
    id: 'blatt05-1d-l-exists-r-bag',
    schemaId: 'lr_semijoin',
    title: 'Tupel aus L mit Partner in R (EXISTS, ohne DISTINCT)',
    source: 'Übungsblatt 5 · Aufg. 1(d)',
    difficulty: 'Mittel',
    topics: ['EXISTS', 'Semi-Join', 'Korrelierte Unterabfrage'],
    prompt:
      'Geben Sie alle Tupel aus $L$ aus, zu denen ein Tupel in $R$ existiert (Gleichheit auf Attribut `c`) OHNE Duplikateliminierung.',
    expectedColumns: ['a', 'b', 'c'],
    orderMatters: false,
    solutionSql: `SELECT L.*
FROM L
WHERE EXISTS (
  SELECT *
  FROM R
  WHERE L.c = R.c
);`,
    hints: [
      'Verwenden Sie ein korreliertes `WHERE EXISTS (SELECT * FROM R WHERE L.c = R.c)`.',
    ],
    solutionExplanation:
      'Unabhängig davon, wie viele Joinpartner ein `l ∈ L` in `R` besitzt, liefert `EXISTS` für dieses `l` nur genau einen Treffer — hier 2 Zeilen (im Gegensatz zu (b)!).',
  },
  {
    id: 'blatt05-1e-l-exists-r-set',
    schemaId: 'lr_semijoin',
    title: 'Tupel aus L mit Partner in R (EXISTS, mit DISTINCT)',
    source: 'Übungsblatt 5 · Aufg. 1(e)',
    difficulty: 'Basis',
    topics: ['EXISTS', 'DISTINCT'],
    prompt:
      'Geben Sie alle Tupel aus $L$ aus, zu denen ein Tupel in $R$ existiert (Gleichheit auf Attribut `c`) MIT Duplikateliminierung.',
    expectedColumns: ['a', 'b', 'c'],
    orderMatters: false,
    requiresDistinct: true,
    solutionSql: `SELECT DISTINCT L.*
FROM L
WHERE EXISTS (
  SELECT *
  FROM R
  WHERE L.c = R.c
);`,
    hints: ['Wie in (d), ergänzt um `SELECT DISTINCT`.'],
    solutionExplanation:
      'Da `L` bereits keine Duplikate enthält, liefert `DISTINCT` hier dieselben 2 Tupel wie (d).',
  },
  {
    id: 'blatt05-1f-r-semijoin-l-bag',
    schemaId: 'lr_semijoin',
    title: 'Join auf R ohne Duplikateliminierung',
    source: 'Übungsblatt 5 · Aufg. 1(f)',
    difficulty: 'Basis',
    topics: ['INNER JOIN', 'Multi-Set-Semantik'],
    prompt:
      'Formulieren Sie den Ausdruck für die Spalten von $R$ in SQL OHNE Duplikateliminierung (`R.*` mit Join über `L.c = R.c`).',
    formulaLatex: 'R \\ltimes_{L.c = R.c} L',
    expectedColumns: ['c', 'd', 'e'],
    orderMatters: false,
    solutionSql: `SELECT R.*
FROM R
INNER JOIN L ON L.c = R.c;`,
    alternativeSolutions: [`SELECT R.* FROM R, L WHERE L.c = R.c;`],
    hints: ['Projizieren Sie `R.*` beim `INNER JOIN` mit `L` über `L.c = R.c`.'],
    solutionExplanation:
      'Jedes der 4 Tupel in `R` findet genau einen Joinpartner in `L`, daher erscheinen alle 4 Zeilen inklusive des doppelten `(c3, d3, e3)`.',
  },
  {
    id: 'blatt05-1g-r-semijoin-l-set',
    schemaId: 'lr_semijoin',
    title: 'Join auf R mit Duplikateliminierung',
    source: 'Übungsblatt 5 · Aufg. 1(g)',
    difficulty: 'Basis',
    topics: ['INNER JOIN', 'DISTINCT'],
    prompt:
      'Formulieren Sie den Ausdruck auf den Spalten von $R$ in SQL MIT Duplikateliminierung.',
    formulaLatex: 'R \\ltimes_{L.c = R.c} L',
    expectedColumns: ['c', 'd', 'e'],
    orderMatters: false,
    requiresDistinct: true,
    solutionSql: `SELECT DISTINCT R.*
FROM R
INNER JOIN L ON L.c = R.c;`,
    alternativeSolutions: [`SELECT DISTINCT R.* FROM R, L WHERE L.c = R.c;`],
    hints: ['Nutzen Sie `SELECT DISTINCT R.*`.'],
    solutionExplanation:
      '`DISTINCT` verschmilzt die beiden identischen Tupel `(c3, d3, e3)` zu einem einzigen → 3 Zeilen.',
  },
  {
    id: 'blatt05-1h-r-exists-l-bag',
    schemaId: 'lr_semijoin',
    title: 'Tupel aus R mit Partner in L (EXISTS, ohne DISTINCT)',
    source: 'Übungsblatt 5 · Aufg. 1(h)',
    difficulty: 'Klausurniveau',
    topics: ['EXISTS', 'Multi-Set-Semantik', 'Basisduplikate'],
    prompt:
      'Geben Sie alle Tupel aus $R$ aus, zu denen ein Tupel in $L$ existiert (Gleichheit auf Attribut `c`) OHNE Duplikateliminierung.',
    expectedColumns: ['c', 'd', 'e'],
    orderMatters: false,
    solutionSql: `SELECT R.*
FROM R
WHERE EXISTS (
  SELECT *
  FROM L
  WHERE L.c = R.c
);`,
    hints: [
      'Nutzen Sie `SELECT R.* FROM R WHERE EXISTS (SELECT * FROM L WHERE L.c = R.c);`.',
    ],
    solutionExplanation:
      'WICHTIGE BEOBACHTUNG von Blatt 5: Das Tupel `(c3, d3, e3)` ist in der Basisrelation `R` zweimal vorhanden. Da beide physischen Zeilen die `EXISTS`-Bedingung erfüllen und kein `DISTINCT` steht, liefert die Anfrage 4 Zeilen!',
  },
  {
    id: 'blatt05-1i-r-exists-l-set',
    schemaId: 'lr_semijoin',
    title: 'Tupel aus R mit Partner in L (EXISTS, mit DISTINCT)',
    source: 'Übungsblatt 5 · Aufg. 1(i)',
    difficulty: 'Basis',
    topics: ['EXISTS', 'DISTINCT'],
    prompt:
      'Geben Sie alle Tupel aus $R$ aus, zu denen ein Tupel in $L$ existiert (Gleichheit auf Attribut `c`) MIT Duplikateliminierung.',
    expectedColumns: ['c', 'd', 'e'],
    orderMatters: false,
    requiresDistinct: true,
    solutionSql: `SELECT DISTINCT R.*
FROM R
WHERE EXISTS (
  SELECT *
  FROM L
  WHERE L.c = R.c
);`,
    hints: ['Ergänzen Sie `DISTINCT` gegenüber (h).'],
    solutionExplanation:
      'Jetzt eliminiert `SELECT DISTINCT` das Basisduplikat `(c3, d3, e3)` und liefert die 3 eindeutigen Tupel aus `R`.',
  },
  {
    id: 'blatt05-1j1-d-ohne-exists',
    schemaId: 'lr_semijoin',
    title: 'Aufgabe (d) ohne EXISTS reproduzieren',
    source: 'Übungsblatt 5 · Aufg. 1(j) · Teil 1',
    difficulty: 'Mittel',
    topics: ['IN', 'Derived Table', 'Semi-Join'],
    prompt:
      'Reproduzieren Sie das exakte Ergebnis von Teilaufgabe (d) (Tupel aus `L` mit passendem `c` in `R`, 2 Zeilen) OHNE Verwendung von `EXISTS`.',
    expectedColumns: ['a', 'b', 'c'],
    orderMatters: false,
    forbiddenSqlPattern: '\\bexists\\b',
    forbiddenSqlMessage:
      'In Aufgabenteil 1(j) darf das Schlüsselwort EXISTS nicht verwendet werden — löse die Abfrage mit IN oder einem JOIN auf SELECT DISTINCT c!',
    solutionSql: `SELECT L.*
FROM L
WHERE c IN (SELECT c FROM R);`,
    alternativeSolutions: [
      `SELECT L.* FROM L INNER JOIN (SELECT DISTINCT c FROM R) AS R2 ON L.c = R2.c;`,
    ],
    hints: [
      'Möglichkeit 1: `WHERE c IN (SELECT c FROM R)` liefert jedes passende `L`-Tupel genau einmal.',
      'Möglichkeit 2: `INNER JOIN (SELECT DISTINCT c FROM R) AS R2 ON L.c = R2.c` verhindert eine Vervielfachung beim Join.',
    ],
    solutionExplanation:
      'Sowohl `c IN (SELECT c FROM R)` als auch der Join mit einer vorab deduplizierten Projektion `(SELECT DISTINCT c FROM R)` vervielfachen `L` nicht.',
  },
  {
    id: 'blatt05-1j2-h-ohne-exists',
    schemaId: 'lr_semijoin',
    title: 'Aufgabe (h) ohne EXISTS reproduzieren',
    source: 'Übungsblatt 5 · Aufg. 1(j) · Teil 2',
    difficulty: 'Mittel',
    topics: ['IN', 'Derived Table', 'Multi-Set-Semantik'],
    prompt:
      'Reproduzieren Sie das exakte Ergebnis von Teilaufgabe (h) (alle 4 Tupel aus `R` mit passendem `c` in `L`, inkl. doppeltem `(c3, d3, e3)`) OHNE Verwendung von `EXISTS`.',
    expectedColumns: ['c', 'd', 'e'],
    orderMatters: false,
    forbiddenSqlPattern: '\\bexists\\b',
    forbiddenSqlMessage:
      'In Aufgabenteil 1(j) darf das Schlüsselwort EXISTS nicht verwendet werden — löse die Abfrage mit IN oder einem JOIN auf SELECT DISTINCT c!',
    solutionSql: `SELECT R.*
FROM R
WHERE c IN (SELECT c FROM L);`,
    alternativeSolutions: [
      `SELECT R.* FROM R INNER JOIN (SELECT DISTINCT c FROM L) AS L2 ON L2.c = R.c;`,
    ],
    hints: [
      'Verwenden Sie `WHERE c IN (SELECT c FROM L)` oder `INNER JOIN (SELECT DISTINCT c FROM L) AS L2 ON L2.c = R.c` (kein `DISTINCT` außen!).',
    ],
    solutionExplanation:
      '`WHERE c IN (SELECT c FROM L)` (bzw. der Join auf `(SELECT DISTINCT c FROM L)`) erhält das doppelte Tupel `(c3, d3, e3)` aus `R`, genau wie in (h).',
  },

  // ===========================================================================
  // ÜBUNGSBLATT 6 · AUFGABE 2 (a–b) auf bahn
  // ===========================================================================
  {
    id: 'blatt06-2a-bahn-ddl',
    schemaId: 'bahn',
    title: 'DDL für das Bahn-Schema mit Integritätsbedingungen',
    source: 'Übungsblatt 6 · Aufg. 2(a)',
    difficulty: 'Klausurniveau',
    topics: ['DDL', 'PRIMARY KEY', 'FOREIGN KEY', 'ON DELETE CASCADE', 'CHECK'],
    prompt:
      'Geben Sie die DDL-Anweisungen (`CREATE TABLE ...`) für `Zug(ZugNr, Zugtyp)`, `Verbindung(ZugNr, Wochentag, StartBhf, ZielBhf)` und `Teilstrecke(ZugNr, Wochentag, vonBhf, nachBhf, AbfahrtZeit, AnkunftZeit, Preis, Entfernung)` an. Berücksichtigen Sie dabei:\n• Primärschlüssel: `(ZugNr)` auf `Zug`, `(ZugNr, Wochentag)` auf `Verbindung`, `(ZugNr, Wochentag, vonBhf)` auf `Teilstrecke`\n• Fremdschlüssel: `Verbindung(ZugNr) → Zug`, `Teilstrecke(ZugNr, Wochentag) → Verbindung` mit `ON DELETE CASCADE` (für 2b!) sowie sinnvolles `CHECK (Wochentag BETWEEN 1 AND 7)`. Hinweis: Bestehende Tabellen werden vor dem Test zurückgesetzt.',
    expectedColumns: ['pruefung', 'status'],
    orderMatters: true,
    setupSql: 'DROP TABLE IF EXISTS Teilstrecke, Verbindung, Zug;',
    verificationSql: `SELECT '1. Tabelle Zug (ZugNr, Zugtyp)' AS pruefung,
  CASE WHEN (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'zug' AND column_name IN ('zugnr', 'zugtyp')
  ) = 2 THEN 'OK' ELSE 'FEHLT' END AS status
UNION ALL
SELECT '2. Primärschlüssel auf Zug (ZugNr)',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'zug' AND con.contype = 'p' AND array_length(con.conkey, 1) = 1
  ) THEN 'OK' ELSE 'FEHLT' END
UNION ALL
SELECT '3. Tabelle Verbindung (4 Spalten + PK auf 2 Spalten)',
  CASE WHEN (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'verbindung'
      AND column_name IN ('zugnr', 'wochentag', 'startbhf', 'zielbhf')
  ) = 4 AND EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'verbindung' AND con.contype = 'p' AND array_length(con.conkey, 1) = 2
  ) THEN 'OK' ELSE 'FEHLT' END
UNION ALL
SELECT '4. Fremdschlüssel Verbindung -> Zug',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_class rc ON rc.oid = con.confrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'verbindung' AND rc.relname = 'zug' AND con.contype = 'f'
  ) THEN 'OK' ELSE 'FEHLT' END
UNION ALL
SELECT '5. Tabelle Teilstrecke (8 Spalten + PK auf 3 Spalten)',
  CASE WHEN (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teilstrecke'
      AND column_name IN ('zugnr', 'wochentag', 'vonbhf', 'nachbhf', 'abfahrtzeit', 'ankunftzeit', 'preis', 'entfernung')
  ) = 8 AND EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'teilstrecke' AND con.contype = 'p' AND array_length(con.conkey, 1) = 3
  ) THEN 'OK' ELSE 'FEHLT' END
UNION ALL
SELECT '6. Fremdschlüssel Teilstrecke -> Verbindung (ON DELETE CASCADE)',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_class rc ON rc.oid = con.confrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'teilstrecke' AND rc.relname = 'verbindung'
      AND con.contype = 'f' AND con.confdeltype = 'c'
  ) THEN 'OK' ELSE 'FEHLT' END
ORDER BY 1 ASC;`,
    verificationNote: 'DDL-Check: prüft alle 3 Tabellen, exakte Spaltennamen, alle 3 Primärschlüssel sowie FKs inkl. ON DELETE CASCADE',
    solutionSql: `CREATE TABLE Zug (
  ZugNr INTEGER NOT NULL PRIMARY KEY,
  Zugtyp VARCHAR(10) NOT NULL
);

CREATE TABLE Verbindung (
  ZugNr INTEGER NOT NULL REFERENCES Zug(ZugNr),
  Wochentag INTEGER NOT NULL CHECK (Wochentag BETWEEN 1 AND 7),
  StartBhf VARCHAR(50) NOT NULL,
  ZielBhf VARCHAR(50) NOT NULL,
  PRIMARY KEY (ZugNr, Wochentag)
);

CREATE TABLE Teilstrecke (
  ZugNr INTEGER NOT NULL,
  Wochentag INTEGER NOT NULL,
  vonBhf VARCHAR(50) NOT NULL,
  nachBhf VARCHAR(50) NOT NULL,
  AbfahrtZeit TIME NOT NULL,
  AnkunftZeit TIME NOT NULL,
  Preis DECIMAL(6, 2) NOT NULL,
  Entfernung INTEGER NOT NULL,
  PRIMARY KEY (ZugNr, Wochentag, vonBhf),
  FOREIGN KEY (ZugNr, Wochentag) REFERENCES Verbindung(ZugNr, Wochentag) ON DELETE CASCADE
);`,
    hints: [
      'Achten Sie auf die Reihenfolge der `CREATE TABLE`-Anweisungen: `Zug` → `Verbindung` → `Teilstrecke`.',
      'Der zusammengesetzte Fremdschlüssel `(ZugNr, Wochentag)` auf `Verbindung` benötigt `ON DELETE CASCADE`, damit Teilaufgabe 2(b) mit einem einzigen `DELETE` funktioniert.',
    ],
    solutionExplanation:
      'Das Schema bildet exakt die 3 Relationen von Blatt 6 Aufg. 2(a) mit zusammengesetzten Schlüsseln, `CHECK (Wochentag BETWEEN 1 AND 7)` und `ON DELETE CASCADE` auf `Teilstrecke → Verbindung` ab.',
  },
  {
    id: 'blatt06-2b-bahn-delete-sylt',
    schemaId: 'bahn',
    title: 'Stilllegung Niebüll → Westerland (kaskadierendes DELETE)',
    source: 'Übungsblatt 6 · Aufg. 2(b)',
    difficulty: 'Klausurniveau',
    topics: ['DELETE', 'ON DELETE CASCADE', 'Unterabfrage'],
    prompt:
      'Die Teilstrecke von `\'Niebüll\'` nach `\'Westerland\'` wird stillgelegt. Löschen Sie mit einer einzigen SQL-Anweisung alle betroffenen Daten (`Verbindung` inkl. aller zugehörigen `Teilstrecke`-Zeilen wie Hamburg → Niebüll), die zu dieser Verbindung gehören (im Schema ist `ON DELETE CASCADE` von `Teilstrecke` auf `Verbindung` bereits aktiv).',
    expectedColumns: ['tabelle', 'zugnr', 'wochentag', 'strecke'],
    orderMatters: false,
    singleStatementOnly: true,
    verificationSql: `SELECT 'Verbindung' AS tabelle, ZugNr::text AS zugnr, Wochentag::text AS wochentag, StartBhf || ' -> ' || ZielBhf AS strecke
FROM Verbindung
UNION ALL
SELECT 'Teilstrecke' AS tabelle, ZugNr::text AS zugnr, Wochentag::text AS wochentag, vonBhf || ' -> ' || nachBhf AS strecke
FROM Teilstrecke;`,
    verificationNote: 'DML-Check: prüft nach deiner DELETE-Anweisung den gesamten Restbestand in Verbindung und Teilstrecke',
    solutionSql: `DELETE FROM Verbindung
WHERE (ZugNr, Wochentag) IN (
  SELECT ZugNr, Wochentag
  FROM Teilstrecke
  WHERE vonBhf = 'Niebüll'
    AND nachBhf = 'Westerland'
);`,
    alternativeSolutions: [
      `DELETE FROM Verbindung WHERE ZugNr IN (SELECT ZugNr FROM Teilstrecke WHERE vonBhf = 'Niebüll' AND nachBhf = 'Westerland');`,
    ],
    hints: [
      'Ein `DELETE FROM Teilstrecke` löscht nur die eine Teilstrecke — die zugehörige `Verbindung` und deren andere Abschnitte (`Hamburg Hbf → Niebüll`) blieben stehen!',
      'Löschen Sie stattdessen in `Verbindung`: dank `ON DELETE CASCADE` löscht PostgreSQL alle zugehörigen `Teilstrecke`-Zeilen automatisch mit.',
    ],
    solutionExplanation:
      'Genau die Kaskaden-Idee aus Blatt 6 Aufg. 2(b): Durch `DELETE FROM Verbindung WHERE ...` verschwindet Verbindung `(302, 5)` samt beiden Teilstrecken (`Hamburg Hbf → Niebüll` und `Niebüll → Westerland`) in einer einzigen Anweisung.',
  },

  // ===========================================================================
  // ÜBUNGSBLATT 7 · AUFGABE 2(b) auf fd_relation
  // ===========================================================================
  {
    id: 'blatt07-2b-fd-check',
    schemaId: 'fd_relation',
    title: 'Funktionale Abhängigkeit A → B per SQL prüfen',
    source: 'Übungsblatt 7 · Aufg. 2(b)',
    difficulty: 'Mittel',
    topics: ['FD-Prüfung', 'GROUP BY', 'COUNT(DISTINCT)', 'HAVING'],
    prompt:
      'Geben Sie eine SQL-Anweisung auf `R(A, B, C, D)` an, mit der überprüft werden kann, ob die funktionale Abhängigkeit $A \\to B$ verletzt ist (Annahme: keine `NULL`-Werte). Geben Sie jeden verletzenden `A`-Wert und die zugehörige Anzahl verschiedener `B`-Werte aus (auf der Basis-Ausprägung liefert die Abfrage 0 Zeilen; ein Zusatztest fängt Verstöße ab).',
    formulaLatex: 'A \\to B \\iff \\neg\\exists r, t \\in R : (r.A = t.A \\land r.B \\neq t.B)',
    expectedColumns: ['A', 'AnzahlB'],
    orderMatters: false,
    allowEmptyExpected: true,
    extraTestCases: [
      {
        label: 'Verletzung von A → B durch Zusatz-Tupel (a1, b2, c9, d1)',
        setupSql: "INSERT INTO R VALUES ('a1', 'b2', 'c9', 'd1');",
      },
    ],
    solutionSql: `SELECT A, COUNT(DISTINCT B) AS AnzahlB
FROM R
GROUP BY A
HAVING COUNT(DISTINCT B) > 1;`,
    hints: [
      'Gruppieren Sie nach dem Determinanten `A` (`GROUP BY A`).',
      'Zählen Sie die *verschiedenen* `B`-Werte pro Gruppe mit `COUNT(DISTINCT B)` und filtern Sie per `HAVING COUNT(DISTINCT B) > 1` (Achtung: `COUNT(*)` wäre falsch!).',
    ],
    solutionExplanation:
      'Genau die Musterlösung von Blatt 7 Aufg. 2(b): Sobald mindestens ein Ergebnis-Tupel zurückkommt, gilt $A \\to B$ in `R` nicht. Im regulären Datensatz liefert die Anfrage 0 Zeilen; beim Zusatztest mit `(\'a1\', \'b2\', \'c9\', \'d1\')` findet sie exakt `(\'a1\', 2)`.',
  },
];

export const WORKSHEETS: WorksheetDef[] = [
  {
    sheetNumber: 3,
    title: 'Übungsblatt 3',
    date: '25.09.2026',
    chapters: 'Kap. 3 · Relationale Algebra',
    summary:
      'Auf Blatt 3 werden alle Anfragen ursprünglich in Relationaler Algebra formuliert — ideal, um Weingut- und Bahn-Aufgaben zusätzlich als SQL zu üben.',
    infoNote:
      'Hinweis: Auf Blatt 3 wird auf Papier mit Relationaler Algebra gearbeitet. Mit dem Filter oben („Auch RA-/Tupelkalkül-Aufgaben als SQL üben“) kannst du Aufg. 4 und Aufg. 5 trotzdem interaktiv in SQL lösen.',
    tasks: [
      {
        id: 'b03-a4',
        taskNumber: 'Aufgabe 4',
        title: 'Weingut-Anfragen (Original: Relationale Algebra)',
        schemaId: 'weingut',
        intro:
          'Gegeben ist das relationale Schema `Rebsorte(Sorte, Name, Farbe)`, `Wein(ID, Name, RSorte)`, `Jahrgang(WeinID, Jahr, Preis, Qualität)`.',
        isOfficialSql: false,
        originalKind: 'Relationale Algebra → SQL',
        subtasks: [
          { label: '(a)', exerciseId: 'weingut-1-merlot-farbe' },
          { label: '(b)', exerciseId: 'weingut-2-bassermann-rebsorte' },
          { label: '(c)', exerciseId: 'weingut-3-riesling-preise' },
          { label: '(d)', exerciseId: 'weingut-4-rebsorten-ohne-wein' },
          { label: '(e)', exerciseId: 'weingut-5-ausschliesslich-exzellent' },
        ],
      },
      {
        id: 'b03-a5',
        taskNumber: 'Aufgabe 5',
        title: 'Streckennetz einer Bahngesellschaft (Original: Relationale Algebra)',
        schemaId: 'bahn',
        intro:
          'Schema `Zug`, `Verbindung`, `Teilstrecke`. Auf Blatt 3 sollte geprüft werden, was in Relationaler Algebra formulierbar ist (c und e benötigen Aggregation/Summe — in SQL lösen wir alle fünf direkt!).',
        isOfficialSql: false,
        originalKind: 'Relationale Algebra → SQL',
        subtasks: [
          { label: '(a)', exerciseId: 'bahn-1-direkt-ma-ka' },
          { label: '(b)', exerciseId: 'bahn-4-alle-zugtypen-division', kindBadge: 'Division' },
          { label: '(c)', exerciseId: 'bahn-3-laengste-teilstrecke' },
          { label: '(d)', exerciseId: 'bahn-11-zwischenstationen-muc-hh' },
          { label: '(e)', exerciseId: 'bahn-5-gesamtpreis-muc-hh', kindBadge: 'SUM' },
        ],
      },
    ],
  },
  {
    sheetNumber: 4,
    title: 'Übungsblatt 4',
    date: '02.10.2026',
    chapters: 'Kap. 3, 4 · RA, Tupelkalkül & SQL',
    summary:
      'Einstieg in SQL auf dem Vorlesungs-Schema der Uni-Datenbank: Übersetzung von Tupelkalkül mit Allquantor (Aufg. 3) und Relationaler Algebra (Aufg. 4a–d) in SQL.',
    tasks: [
      {
        id: 'b04-a3',
        taskNumber: 'Aufgabe 3',
        title: 'Tupelkalkül ohne Allquantor → SQL (Bioethik)',
        schemaId: 'uni',
        intro:
          'Bestimmen Sie die Namen der Studenten, die „Bioethik“ besuchen und alle direkt von dieser Vorlesung vorausgesetzten Vorlesungen besucht haben.',
        isOfficialSql: true,
        subtasks: [
          { label: 'Aufg. 3', exerciseId: 'uni-5-bioethik-allquantor', kindBadge: 'Allquantor' },
        ],
      },
      {
        id: 'b04-a4',
        taskNumber: 'Aufgabe 4',
        title: 'Algebraische Ausdrücke als SQL formulieren',
        schemaId: 'uni',
        intro:
          'Übersetzen Sie die vier vorgegebenen Ausdrücke der Relationalen Algebra auf dem Universitätsschema direkt in PostgreSQL.',
        isOfficialSql: true,
        subtasks: [
          { label: '(a)', exerciseId: 'uni-1-logik', kindBadge: 'JOIN' },
          { label: '(b)', exerciseId: 'uni-2-pruefende-profs', kindBadge: 'Semi-Join' },
          { label: '(c)', exerciseId: 'uni-3-ungepruefte-studenten', kindBadge: 'EXCEPT / NOT EXISTS' },
          { label: '(d)', exerciseId: 'uni-4-max-sws', kindBadge: 'MAX / NOT EXISTS' },
        ],
      },
      {
        id: 'b04-a1',
        taskNumber: 'Aufgabe 1',
        title: 'Weingut im Tupelkalkül (Bonus als SQL)',
        schemaId: 'weingut',
        intro: 'Dieselben 5 Anfragen wie Blatt 3 Aufg. 4 — hier im Original im Tupelkalkül gestellt.',
        isOfficialSql: false,
        originalKind: 'Tupelkalkül → SQL',
        subtasks: [
          { label: '(a)', exerciseId: 'weingut-1-merlot-farbe' },
          { label: '(b)', exerciseId: 'weingut-2-bassermann-rebsorte' },
          { label: '(c)', exerciseId: 'weingut-3-riesling-preise' },
          { label: '(d)', exerciseId: 'weingut-4-rebsorten-ohne-wein' },
          { label: '(e)', exerciseId: 'weingut-5-ausschliesslich-exzellent' },
        ],
      },
      {
        id: 'b04-a2',
        taskNumber: 'Aufgabe 2',
        title: 'Unternehmensschema Angestellte / Abteilung (Bonus als SQL)',
        schemaId: 'unternehmen',
        intro:
          'Im Original für Relationale Algebra & Tupelkalkül auf `Angestellte` und `Abteilung` inkl. Self-Join und Division.',
        isOfficialSql: false,
        originalKind: 'RA & TK → SQL',
        subtasks: [
          { label: '(a)', exerciseId: 'unt-1-abteilungen' },
          { label: '(b)', exerciseId: 'unt-2-mannheim' },
          { label: '(c)', exerciseId: 'unt-3-programmierer-darmstadt' },
          { label: '(d)', exerciseId: 'unt-4-mehr-als-chef', kindBadge: 'Self-Join' },
          { label: '(e)', exerciseId: 'unt-5-leere-abteilungen', kindBadge: 'Anti-Join' },
          { label: '(f)', exerciseId: 'unt-6-alle-berufe-division', kindBadge: 'Division' },
        ],
      },
    ],
  },
  {
    sheetNumber: 5,
    title: 'Übungsblatt 5',
    date: '09.10.2026',
    chapters: 'Kap. 3, 4 · Semi-Join, NULL & TerraDB',
    summary:
      'Kernblatt für SQL-Abfragen: Duplikatsemantik bei Joins vs. EXISTS (Aufg. 1a–j) sowie 9 klassische SQL-Anfragen auf der Terra-Datenbank (Aufg. 5a–i).',
    infoNote:
      'Außerdem auf Blatt 5: Aufg. 3 (Bahn-SQL-Multiple-Choice — als eigenständige Schreibaufgabe auch unter „Alle Schemas“ als „Zugtypen Mannheim → Frankfurt“ enthalten) sowie Aufg. 4 (NULL-Semantik im Kopf).',
    tasks: [
      {
        id: 'b05-a1',
        taskNumber: 'Aufgabe 1',
        title: 'Relationen L und R: DDL, Semi-Join, EXISTS & Multi-Set-Semantik',
        schemaId: 'lr_semijoin',
        intro:
          'Anlegen der Relationen `L(a, b, c)` und `R(c, d, e)` sowie systematischer Vergleich von `INNER JOIN` vs. `EXISTS`, jeweils mit und ohne `DISTINCT` bis hin zu `IN`/Derived-Table-Alternativen.',
        isOfficialSql: true,
        subtasks: [
          { label: '(a)', exerciseId: 'blatt05-1a-ddl-insert', kindBadge: 'DDL / INSERT' },
          { label: '(b)', exerciseId: 'blatt05-1b-l-semijoin-r-bag', kindBadge: 'JOIN' },
          { label: '(c)', exerciseId: 'blatt05-1c-l-semijoin-r-set', kindBadge: 'JOIN + DISTINCT' },
          { label: '(d)', exerciseId: 'blatt05-1d-l-exists-r-bag', kindBadge: 'EXISTS' },
          { label: '(e)', exerciseId: 'blatt05-1e-l-exists-r-set', kindBadge: 'EXISTS + DISTINCT' },
          { label: '(f)', exerciseId: 'blatt05-1f-r-semijoin-l-bag', kindBadge: 'JOIN' },
          { label: '(g)', exerciseId: 'blatt05-1g-r-semijoin-l-set', kindBadge: 'JOIN + DISTINCT' },
          { label: '(h)', exerciseId: 'blatt05-1h-r-exists-l-bag', kindBadge: 'EXISTS (Bag)' },
          { label: '(i)', exerciseId: 'blatt05-1i-r-exists-l-set', kindBadge: 'EXISTS + DISTINCT' },
          { label: '(j1)', exerciseId: 'blatt05-1j1-d-ohne-exists', kindBadge: 'Ohne EXISTS' },
          { label: '(j2)', exerciseId: 'blatt05-1j2-h-ohne-exists', kindBadge: 'Ohne EXISTS' },
        ],
      },
      {
        id: 'b05-a5',
        taskNumber: 'Aufgabe 5',
        title: 'SQL-Training auf der Terra-Datenbank',
        schemaId: 'terra',
        intro:
          'Alle 9 Teilaufgaben (a)–(i) auf dem Geographie-Schema der TerraDB: von nicht-symmetrischen Nachbarn über Generalisierung bis zu `HAVING`, `WITH` und `RANK() OVER`.',
        isOfficialSql: true,
        subtasks: [
          { label: '(a)', exerciseId: 'terra-1-usa-nachbarn', kindBadge: 'Asymmetrie' },
          { label: '(b)', exerciseId: 'terra-2-organisation-sitz' },
          { label: '(c)', exerciseId: 'terra-3-berge-pro-land', kindBadge: 'GROUP BY' },
          { label: '(d)', exerciseId: 'terra-4-hauptstaedte-fluss', kindBadge: 'Generalisierung' },
          { label: '(e)', exerciseId: 'terra-5-laender-ohne-wuesten', kindBadge: 'NOT EXISTS' },
          { label: '(f)', exerciseId: 'terra-14-orgs-ueber-20', kindBadge: 'HAVING' },
          { label: '(g)', exerciseId: 'terra-6-groesste-organisation', kindBadge: 'CTE + MAX' },
          { label: '(h)', exerciseId: 'terra-7-inselstaaten', kindBadge: 'NOT EXISTS' },
          { label: '(i)', exerciseId: 'terra-8-rangliste-europa', kindBadge: 'RANK() OVER' },
        ],
      },
    ],
  },
  {
    sheetNumber: 6,
    title: 'Übungsblatt 6',
    date: '16.10.2026',
    chapters: 'Kap. 4, 5, 6 · Rekursives SQL, DDL/DELETE & TerraDB',
    summary:
      'Rekursive SQL-Anfragen mit `WITH RECURSIVE` (TerraDB & Mitarbeiterhierarchie), DDL/Kaskadenlöschen für das Bahn-Schema sowie 9 weitere TerraDB-Aufgaben.',
    tasks: [
      {
        id: 'b06-a1',
        taskNumber: 'Aufgabe 1',
        title: 'Direkte & indirekte Nachbarländer Deutschlands (Rekursives SQL)',
        schemaId: 'terra',
        intro:
          'Symmetrisieren Sie `benachbart` und bestimmen Sie per `WITH RECURSIVE` alle auf dem Landweg von Deutschland erreichbaren Länder (mit Zyklusterminierung).',
        isOfficialSql: true,
        subtasks: [
          { label: 'Aufg. 1', exerciseId: 'terra-13-rekursiv-deutschland', kindBadge: 'WITH RECURSIVE' },
        ],
      },
      {
        id: 'b06-a2',
        taskNumber: 'Aufgabe 2',
        title: 'Bahn-Schema: DDL & kaskadierendes DELETE',
        schemaId: 'bahn',
        intro:
          'Definieren Sie in (a) das vollständige relationale DDL inkl. `PRIMARY KEY`, `CHECK` und `FOREIGN KEY ... ON DELETE CASCADE` und löschen Sie in (b) alle Daten zu Niebüll → Westerland in einer einzigen SQL-Anweisung.',
        isOfficialSql: true,
        subtasks: [
          { label: '(a)', exerciseId: 'blatt06-2a-bahn-ddl', kindBadge: 'DDL' },
          { label: '(b)', exerciseId: 'blatt06-2b-bahn-delete-sylt', kindBadge: 'DELETE' },
        ],
      },
      {
        id: 'b06-a4',
        taskNumber: 'Aufgabe 4',
        title: 'Rekursive Abfragen: Fakultät n! & Hierarchie „Marlon“',
        schemaId: 'employee',
        intro:
          'Berechnen Sie in (a) die Fakultät $n!$ für $0 \\le n \\le 10$ und bestimmen Sie in (b) rekursiv alle Vorgesetzten von „Marlon“ (Achtung: Wurzel Ainslie verweist auf sich selbst!).',
        isOfficialSql: true,
        subtasks: [
          { label: '(a)', exerciseId: 'emp-14-fakultaet-rekursiv', kindBadge: 'WITH RECURSIVE' },
          { label: '(b)', exerciseId: 'emp-2-vorgesetzte-marlon', kindBadge: 'Zyklenschutz' },
        ],
      },
      {
        id: 'b06-a5',
        taskNumber: 'Aufgabe 5',
        title: 'Fortgeschrittene TerraDB-Anfragen',
        schemaId: 'terra',
        intro:
          'Alle 9 Teilaufgaben (a)–(i): `LIKE`, Einheiten-Umrechnung bei Kontinent/Wüste, `> ALL`, `= ANY`, CTE-Verhältnisse und Top-5-Ranking trotz NULL-Werten.',
        isOfficialSql: true,
        subtasks: [
          { label: '(a)', exerciseId: 'terra-9-wuesten-gross', kindBadge: 'LIKE' },
          { label: '(b)', exerciseId: 'terra-15-wuesten-australien' },
          { label: '(c)', exerciseId: 'terra-16-noerdlichste-stadt', kindBadge: 'MAX' },
          { label: '(d)', exerciseId: 'terra-17-wuestenanteil-kontinent', kindBadge: 'Einheiten-Falle' },
          { label: '(e)', exerciseId: 'terra-10-flache-meere-tiefe-seen', kindBadge: 'Theta-Join' },
          { label: '(f)', exerciseId: 'terra-11-staedte-groesser-china', kindBadge: '> ALL + NULL' },
          { label: '(g)', exerciseId: 'terra-12-landesteile-alles', kindBadge: '= ANY / IN' },
          { label: '(h)', exerciseId: 'terra-18-hauptstaedte-org-verhaeltnis', kindBadge: 'CTEs' },
          { label: '(i)', exerciseId: 'terra-19-top5-wuesten', kindBadge: 'RANK() OVER' },
        ],
      },
    ],
  },
  {
    sheetNumber: 7,
    title: 'Übungsblatt 7',
    date: '21.10.2026',
    chapters: 'Kap. 5, 6 · Integritätsbedingungen & Funktionale Abhängigkeiten',
    summary:
      'Neben der Analyse von UPDATE/DELETE-Kaskaden auf dem Ticket-Schema (Aufg. 1) verlangt Aufg. 2(b) eine SQL-Abfrage zum Prüfen funktionaler Abhängigkeiten.',
    infoNote:
      'Hinweis zu Blatt 7 Aufg. 1 (Ticket-Schema): Auf dem Blatt selbst werden 4 vorgegebene DML-Befehle analysiert — weitere 13 aktive SQL-Übungsaufgaben auf demselben 22-Tupel-Ticket-Schema findest du im Tab „Alle Schemas“.',
    tasks: [
      {
        id: 'b07-a2',
        taskNumber: 'Aufgabe 2(b)',
        title: 'Funktionale Abhängigkeit A → B mit SQL überprüfen',
        schemaId: 'fd_relation',
        intro:
          'Gegeben ist `R(A, B, C, D)`. Formulieren Sie eine SQL-Abfrage, die Verstöße gegen die funktionale Abhängigkeit $A \\to B$ findet (mit automatischem Gegenbeispiel-Test!).',
        isOfficialSql: true,
        subtasks: [
          { label: '(b)', exerciseId: 'blatt07-2b-fd-check', kindBadge: 'FD-Prüfung' },
        ],
      },
    ],
  },
  {
    sheetNumber: 9,
    title: 'Übungsblatt 9',
    date: '06.11.2026',
    chapters: 'Kap. 6, 8 · Anfrageoptimierung & Operatorbäume',
    summary:
      'Auf Blatt 9 wird eine SQL-Anfrage auf dem Schema Sachbearbeiter/Kunde/betreut logisch optimiert — hier optional zum direkten Ausprobieren.',
    infoNote:
      'Hinweis: Auf Blatt 9 steht das gegebene SELECT bereits in Aufg. 2. Zusätzlich warten 13 weitere SQL-Aufgaben auf demselben Betreuungs-Schema unter „Alle Schemas“.',
    tasks: [
      {
        id: 'b09-a2',
        taskNumber: 'Aufgabe 2',
        title: 'Sachbearbeiter von Kunden namens „Schmidt“',
        schemaId: 'betreuung',
        intro: 'Die zugrundeliegende Anfrage aus Aufg. 2(a) zum selbst Nachbauen.',
        isOfficialSql: false,
        originalKind: 'Optimierungsbeispiel → SQL',
        subtasks: [
          { label: '(a)', exerciseId: 'betr-1-schmidt-betreuer' },
        ],
      },
    ],
  },
];

export function getOfficialSheetExerciseIds(): string[] {
  const seen = new Set<string>();
  for (const sheet of WORKSHEETS) {
    for (const task of sheet.tasks) {
      if (!task.isOfficialSql) continue;
      for (const sub of task.subtasks) {
        seen.add(sub.exerciseId);
      }
    }
  }
  return [...seen];
}
