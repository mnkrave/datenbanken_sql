import type { Exercise, SchemaDef } from '../../types/sql';

export const uniSchema: SchemaDef = {
  id: 'uni',
  title: 'Universitäts-Datenbank (Uni-DB)',
  shortTitle: 'Uni-DB',
  sheets: 'Übungsblatt 4 · Vorlesung Kap. 3–5',
  summary:
    'Das klassische Kemper-/Moerkotte-Universitätsschema aus Vorlesung und Übungsblatt 4 mit Studenten, Professoren, Vorlesungen, Assistenten sowie den Beziehungen hoeren, voraussetzen und pruefen.',
  explanationBullets: [
    'Studenten werden über ihre eindeutige MatrNr identifiziert und besitzen Name sowie Semester.',
    'Vorlesungen besitzen VorlNr, Titel, SWS und den Fremdschlüssel gelesenVon (aus der zusammengefassten 1:N-Beziehung „lesen“ zu Professoren).',
    'Professoren (PersNr, Name, Rang, Raum) betreuen Assistenten (Fremdschlüssel Boss in Assistenten).',
    'Die N:M-Beziehung hoeren speichert, welche Studenten welche Vorlesungen besuchen.',
    'Die rekursive N:M-Beziehung voraussetzen modelliert direkte Vorlesungsvoraussetzungen (Vorgaenger wird von Nachfolger vorausgesetzt).',
    'Die ternäre Beziehung pruefen speichert Prüfungsleistungen (Note) eines Studenten in einer Vorlesung bei einem prüfenden Professor.',
  ],
  examNotes: [
    'Tabellen- und Spaltennamen verwenden in SQL keine Umlaute: hoeren, pruefen, Vorgaenger (wie in der Musterlösung zu Blatt 4).',
    'Schlüssel-Falle: Bei pruefen ist (MatrNr, VorlNr) der Primärschlüssel — PersNr gehört wegen der Funktionalität N:M:1 nicht zum Schlüssel.',
    'Mengen- vs. Multimengensemantik: Bei Übersetzungen aus der Relationalen Algebra nach SQL ist DISTINCT in der Regel zwingend!',
  ],
  tables: [
    {
      name: 'Studenten',
      description: 'Eingeschriebene Studierende',
      columns: [
        { name: 'MatrNr', type: 'INTEGER', isPk: true },
        { name: 'Name', type: 'VARCHAR(30)' },
        { name: 'Semester', type: 'INTEGER' },
      ],
    },
    {
      name: 'Professoren',
      description: 'Lehrstuhlinhaberinnen und Professoren',
      columns: [
        { name: 'PersNr', type: 'INTEGER', isPk: true },
        { name: 'Name', type: 'VARCHAR(30)' },
        { name: 'Rang', type: 'CHAR(2)' },
        { name: 'Raum', type: 'INTEGER' },
      ],
    },
    {
      name: 'Assistenten',
      description: 'Wissenschaftliche Mitarbeiter eines Professors',
      columns: [
        { name: 'PersNr', type: 'INTEGER', isPk: true },
        { name: 'Name', type: 'VARCHAR(30)' },
        { name: 'Fachgebiet', type: 'VARCHAR(30)' },
        { name: 'Boss', type: 'INTEGER', fkTarget: 'Professoren.PersNr' },
      ],
    },
    {
      name: 'Vorlesungen',
      description: 'Vorlesungsangebot inkl. verantwortlichem Dozenten',
      columns: [
        { name: 'VorlNr', type: 'INTEGER', isPk: true },
        { name: 'Titel', type: 'VARCHAR(40)' },
        { name: 'SWS', type: 'INTEGER' },
        { name: 'gelesenVon', type: 'INTEGER', fkTarget: 'Professoren.PersNr' },
      ],
    },
    {
      name: 'hoeren',
      description: 'Welche Studenten welche Vorlesungen besuchen (N:M)',
      columns: [
        { name: 'MatrNr', type: 'INTEGER', isPk: true, fkTarget: 'Studenten.MatrNr' },
        { name: 'VorlNr', type: 'INTEGER', isPk: true, fkTarget: 'Vorlesungen.VorlNr' },
      ],
    },
    {
      name: 'voraussetzen',
      description: 'Direkte Vorlesungsvoraussetzungen (Vorgaenger → Nachfolger)',
      columns: [
        { name: 'Vorgaenger', type: 'INTEGER', isPk: true, fkTarget: 'Vorlesungen.VorlNr' },
        { name: 'Nachfolger', type: 'INTEGER', isPk: true, fkTarget: 'Vorlesungen.VorlNr' },
      ],
    },
    {
      name: 'pruefen',
      description: 'Abgelegte Prüfungen inkl. Prüfer und Note',
      columns: [
        { name: 'MatrNr', type: 'INTEGER', isPk: true, fkTarget: 'Studenten.MatrNr' },
        { name: 'VorlNr', type: 'INTEGER', isPk: true, fkTarget: 'Vorlesungen.VorlNr' },
        { name: 'PersNr', type: 'INTEGER', fkTarget: 'Professoren.PersNr' },
        { name: 'Note', type: 'NUMERIC(2,1)' },
      ],
    },
  ],
  seedSql: `
    CREATE TABLE Professoren (
      PersNr INTEGER PRIMARY KEY,
      Name VARCHAR(30) NOT NULL,
      Rang CHAR(2),
      Raum INTEGER
    );

    CREATE TABLE Studenten (
      MatrNr INTEGER PRIMARY KEY,
      Name VARCHAR(30) NOT NULL,
      Semester INTEGER
    );

    CREATE TABLE Assistenten (
      PersNr INTEGER PRIMARY KEY,
      Name VARCHAR(30) NOT NULL,
      Fachgebiet VARCHAR(30),
      Boss INTEGER REFERENCES Professoren(PersNr) ON DELETE SET NULL
    );

    CREATE TABLE Vorlesungen (
      VorlNr INTEGER PRIMARY KEY,
      Titel VARCHAR(40) NOT NULL,
      SWS INTEGER,
      gelesenVon INTEGER REFERENCES Professoren(PersNr) ON DELETE SET NULL
    );

    CREATE TABLE hoeren (
      MatrNr INTEGER REFERENCES Studenten(MatrNr) ON DELETE CASCADE,
      VorlNr INTEGER REFERENCES Vorlesungen(VorlNr) ON DELETE CASCADE,
      PRIMARY KEY (MatrNr, VorlNr)
    );

    CREATE TABLE voraussetzen (
      Vorgaenger INTEGER REFERENCES Vorlesungen(VorlNr) ON DELETE CASCADE,
      Nachfolger INTEGER REFERENCES Vorlesungen(VorlNr) ON DELETE CASCADE,
      PRIMARY KEY (Vorgaenger, Nachfolger)
    );

    CREATE TABLE pruefen (
      MatrNr INTEGER REFERENCES Studenten(MatrNr) ON DELETE CASCADE,
      VorlNr INTEGER REFERENCES Vorlesungen(VorlNr) ON DELETE CASCADE,
      PersNr INTEGER REFERENCES Professoren(PersNr) ON DELETE SET NULL,
      Note NUMERIC(2,1),
      PRIMARY KEY (MatrNr, VorlNr)
    );

    INSERT INTO Professoren VALUES
      (2125, 'Sokrates', 'C4', 226),
      (2126, 'Russel', 'C4', 232),
      (2127, 'Kopernikus', 'C3', 310),
      (2133, 'Popper', 'C3', 52),
      (2134, 'Augustinus', 'C3', 309),
      (2136, 'Curie', 'C4', 36),
      (2137, 'Kant', 'C4', 7);

    INSERT INTO Studenten VALUES
      (24002, 'Xenokrates', 18),
      (25403, 'Jonas', 12),
      (26120, 'Fichte', 10),
      (26830, 'Aristoxenos', 8),
      (27550, 'Schopenhauer', 6),
      (28106, 'Carnap', 3),
      (29120, 'Theophrastos', 2),
      (29555, 'Feuerbach', 2);

    INSERT INTO Assistenten VALUES
      (3002, 'Platon', 'Ideenlehre', 2125),
      (3003, 'Aristoteles', 'Syllogistik', 2125),
      (3004, 'Wittgenstein', 'Sprachtheorie', 2126),
      (3005, 'Rhetikus', 'Planetenbewegung', 2127),
      (3006, 'Newton', 'Keplersche Gesetze', 2127),
      (3007, 'Spinoza', 'Gott und Natur', 2126);

    INSERT INTO Vorlesungen VALUES
      (5001, 'Grundzüge', 4, 2137),
      (5041, 'Ethik', 4, 2125),
      (5043, 'Erkenntnistheorie', 3, 2126),
      (5049, 'Mäeutik', 2, 2125),
      (4052, 'Logik', 4, 2125),
      (5052, 'Wissenschaftstheorie', 3, 2126),
      (5216, 'Bioethik', 2, 2126),
      (5259, 'Der Wiener Kreis', 2, 2133),
      (5022, 'Glaube und Wissen', 2, 2134),
      (4630, 'Die 3 Kritiken', 4, 2137);

    INSERT INTO hoeren VALUES
      (26120, 5001),
      (27550, 5001),
      (27550, 4052),
      (28106, 5041),
      (28106, 5052),
      (28106, 5216),
      (28106, 5259),
      (26830, 5216),
      (29120, 5001),
      (29120, 5041),
      (29120, 5049),
      (29555, 5022),
      (25403, 5022);

    INSERT INTO voraussetzen VALUES
      (5001, 5041),
      (5001, 5043),
      (5001, 5049),
      (5041, 5216),
      (5043, 5052),
      (5041, 5052),
      (5052, 5259);

    INSERT INTO pruefen VALUES
      (28106, 5001, 2126, 1.0),
      (28106, 5041, 2125, 1.3),
      (25403, 5041, 2125, 2.0),
      (27550, 4630, 2137, 2.0);
  `,
};

export const uniExercises: Exercise[] = [
  {
    id: 'uni-1-logik',
    schemaId: 'uni',
    title: 'Hörer der Vorlesung „Logik“',
    source: 'Übungsblatt 4 · Aufg. 4(a)',
    difficulty: 'Basis',
    topics: ['JOIN', 'DISTINCT', 'Relationale Algebra → SQL'],
    prompt:
      'Übersetzen Sie den algebraischen Ausdruck Π_Name(Studenten ⋈ hoeren ⋈ σ_Titel=\'Logik\'(Vorlesungen)) in SQL: Geben Sie die Namen (ohne Duplikate) aller Studenten aus, die die Vorlesung \'Logik\' besuchen.',
    expectedColumns: ['Name'],
    orderMatters: false,
    requiresDistinct: true,
    solutionSql: `SELECT DISTINCT s.Name
FROM Studenten s
JOIN hoeren h ON s.MatrNr = h.MatrNr
JOIN Vorlesungen v ON h.VorlNr = v.VorlNr
WHERE v.Titel = 'Logik';`,
    alternativeSolutions: [
      `SELECT DISTINCT s.Name FROM Studenten s NATURAL JOIN hoeren h NATURAL JOIN Vorlesungen v WHERE v.Titel = 'Logik';`,
    ],
    hints: [
      'Verknüpfen Sie Studenten über hoeren (MatrNr) mit Vorlesungen (VorlNr).',
      'Filtern Sie mit WHERE v.Titel = \'Logik\' (einfache Anführungszeichen!) und denken Sie an DISTINCT.',
    ],
    solutionExplanation:
      'Da die Relationale Algebra Mengen- und SQL Multimengensemantik verwendet, gehört bei der Übersetzung immer SELECT DISTINCT dazu. Drei-Wege-Join über MatrNr und VorlNr (oder NATURAL JOIN).',
  },
  {
    id: 'uni-2-pruefende-profs',
    schemaId: 'uni',
    title: 'Prüfende Professoren (Semi-Join)',
    source: 'Übungsblatt 4 · Aufg. 4(b)',
    difficulty: 'Basis',
    topics: ['Semi-Join', 'EXISTS / IN', 'DISTINCT'],
    prompt:
      'Übersetzen Sie Π_Name(Professoren ⋉ pruefen) in SQL: Geben Sie die Namen (ohne Duplikate) aller Professoren aus, die mindestens eine Prüfung abgenommen haben.',
    expectedColumns: ['Name'],
    orderMatters: false,
    requiresDistinct: true,
    solutionSql: `SELECT DISTINCT p.Name
FROM Professoren p
WHERE EXISTS (
  SELECT *
  FROM pruefen pr
  WHERE pr.PersNr = p.PersNr
);`,
    alternativeSolutions: [
      `SELECT DISTINCT p.Name FROM Professoren p JOIN pruefen pr ON p.PersNr = pr.PersNr;`,
      `SELECT DISTINCT Name FROM Professoren WHERE PersNr IN (SELECT PersNr FROM pruefen);`,
    ],
    hints: [
      'Ein Semi-Join lässt sich in SQL per EXISTS, IN oder als INNER JOIN mit DISTINCT formulieren.',
      'Beachten Sie: Ein Professor kann mehrere Prüfungen abnehmen — ohne DISTINCT bzw. Semi-Join entstehen Duplikate.',
    ],
    solutionExplanation:
      'WHERE EXISTS (...), WHERE PersNr IN (...) und INNER JOIN + DISTINCT liefern hier alle exakt dieselbe Menge an Professorennamen.',
  },
  {
    id: 'uni-3-ungepruefte-studenten',
    schemaId: 'uni',
    title: 'Studenten ohne Prüfungen (Differenz / Anti-Join)',
    source: 'Übungsblatt 4 · Aufg. 4(c)',
    difficulty: 'Mittel',
    topics: ['EXCEPT', 'NOT EXISTS', 'Anti-Join'],
    prompt:
      'Übersetzen Sie Π_MatrNr(Studenten) \\ Π_MatrNr(pruefen) in SQL: Geben Sie die MatrNr aller Studenten aus, die noch keine Prüfung abgelegt haben.',
    expectedColumns: ['MatrNr'],
    orderMatters: false,
    requiresDistinct: true,
    solutionSql: `SELECT s.MatrNr
FROM Studenten s
WHERE NOT EXISTS (
  SELECT *
  FROM pruefen p
  WHERE p.MatrNr = s.MatrNr
);`,
    alternativeSolutions: [
      `(SELECT MatrNr FROM Studenten) EXCEPT (SELECT MatrNr FROM pruefen);`,
      `SELECT MatrNr FROM Studenten WHERE MatrNr NOT IN (SELECT MatrNr FROM pruefen);`,
    ],
    hints: [
      'Nutzen Sie EXCEPT, NOT EXISTS oder NOT IN.',
      'Klausurtipp: NOT EXISTS ist robuster als NOT IN, falls die Unterabfrage jemals NULL-Werte liefern könnte.',
    ],
    solutionExplanation:
      'Die Mengendifferenz entspricht direkt EXCEPT (welches in SQL standardmäßig Duplikate eliminiert) oder einer korrelierten NOT EXISTS-Unterabfrage.',
  },
  {
    id: 'uni-4-max-sws',
    schemaId: 'uni',
    title: 'Vorlesungen mit maximalen SWS',
    source: 'Übungsblatt 4 · Aufg. 4(d)',
    difficulty: 'Mittel',
    topics: ['Unterabfrage', 'MAX', 'NOT EXISTS'],
    prompt:
      'Übersetzen Sie Π_VorlNr(Vorlesungen) \\ Π_v1.VorlNr(ρ_v1(Vorlesungen) ⋈_{v1.SWS < v2.SWS} ρ_v2(Vorlesungen)) in SQL: Geben Sie die VorlNr aller Vorlesungen mit der maximalen SWS-Anzahl aus.',
    expectedColumns: ['VorlNr'],
    orderMatters: false,
    requiresDistinct: true,
    solutionSql: `SELECT DISTINCT VorlNr
FROM Vorlesungen
WHERE SWS = (SELECT MAX(SWS) FROM Vorlesungen);`,
    alternativeSolutions: [
      `SELECT DISTINCT v.VorlNr FROM Vorlesungen v WHERE NOT EXISTS (SELECT * FROM Vorlesungen v2 WHERE v.SWS < v2.SWS);`,
      `SELECT DISTINCT VorlNr FROM Vorlesungen WHERE SWS >= ALL (SELECT SWS FROM Vorlesungen);`,
    ],
    hints: [
      'Der algebraische Ausdruck entfernt alle Vorlesungen, zu denen es eine Vorlesung mit strikt größeren SWS gibt — übrig bleiben die Maxima.',
      'In SQL können Sie entweder mit = (SELECT MAX(SWS) ...) oder mit NOT EXISTS (... WHERE v.SWS < v2.SWS) arbeiten.',
    ],
    solutionExplanation:
      'Die Maximum-Bestimmung ohne Aggregat in der Relationalen Algebra entspricht in SQL entweder SWS = (SELECT MAX(SWS) FROM Vorlesungen), >= ALL oder der direkten NOT EXISTS-Übersetzung.',
  },
  {
    id: 'uni-5-bioethik-allquantor',
    schemaId: 'uni',
    title: 'Allquantor: Bioethik & alle direkten Voraussetzungen',
    source: 'Übungsblatt 4 · Aufg. 3',
    difficulty: 'Klausurniveau',
    topics: ['Allquantor', 'Doppeltes NOT EXISTS', 'Tupelkalkül → SQL'],
    prompt:
      'Geben Sie die Namen (ohne Duplikate) aller Studenten an, die die Vorlesung \'Bioethik\' besuchen UND alle Vorlesungen besucht haben, die direkt von \'Bioethik\' vorausgesetzt werden.',
    expectedColumns: ['Name'],
    orderMatters: false,
    requiresDistinct: true,
    solutionSql: `SELECT DISTINCT s.Name
FROM Studenten s, hoeren h, Vorlesungen v
WHERE s.MatrNr = h.MatrNr
  AND h.VorlNr = v.VorlNr
  AND v.Titel = 'Bioethik'
  AND NOT EXISTS (
    SELECT *
    FROM voraussetzen vs
    WHERE vs.Nachfolger = v.VorlNr
      AND NOT EXISTS (
        SELECT *
        FROM hoeren x
        WHERE x.MatrNr = s.MatrNr
          AND x.VorlNr = vs.Vorgaenger
      )
  );`,
    hints: [
      'Formen Sie den Allquantor ∀vs (vs.Nachfolger = v.VorlNr ⇒ ∃x ∈ hoeren ...) mittels De Morgan um: ¬∃vs (vs.Nachfolger = v.VorlNr ∧ ¬∃x ∈ hoeren ...).',
      'Übersetzen Sie das in ein doppeltes NOT EXISTS: „Es gibt keine direkte Voraussetzung von Bioethik, die der Student nicht gehört hat.“',
    ],
    solutionExplanation:
      'Klassiker aus Blatt 4 Aufg. 3: Aristoxenos hört zwar Bioethik, hat aber die direkte Voraussetzung Ethik (5041) nicht gehört — nur Carnap erfüllt die Allquantor-Bedingung.',
  },
  {
    id: 'uni-6-profs-vorlesungsanzahl',
    schemaId: 'uni',
    title: 'Lehrbelastung pro Professor (inkl. 0 Vorlesungen)',
    source: 'Klausurtraining (nach Kap. 4 & Blatt 4)',
    difficulty: 'Mittel',
    topics: ['LEFT JOIN', 'GROUP BY', 'COUNT(Spalte) vs COUNT(*)'],
    prompt:
      'Geben Sie für jeden Professor dessen Name und die Anzahl der von ihm gelesenen Vorlesungen aus — auch für Professoren, die derzeit keine Vorlesung halten (dort soll 0 stehen). Sortieren Sie absteigend nach der Anzahl und bei Gleichstand alphabetisch aufsteigend nach Name.',
    expectedColumns: ['Name', 'Anzahl'],
    orderMatters: true,
    solutionSql: `SELECT p.Name, COUNT(v.VorlNr) AS Anzahl
FROM Professoren p
LEFT OUTER JOIN Vorlesungen v ON p.PersNr = v.gelesenVon
GROUP BY p.PersNr, p.Name
ORDER BY Anzahl DESC, p.Name ASC;`,
    hints: [
      'Ein normaler INNER JOIN verliert Professoren ohne Vorlesung (wie Kopernikus und Curie). Nutzen Sie einen LEFT OUTER JOIN.',
      'Achtung Klausurfalle: COUNT(*) würde bei einer NULL-Zeile aus dem LEFT JOIN 1 statt 0 zählen! Verwenden Sie COUNT(v.VorlNr).',
    ],
    solutionExplanation:
      'COUNT(v.VorlNr) ignoriert NULL-Werte aus dem LEFT OUTER JOIN und liefert daher 0 für Kopernikus und Curie, während COUNT(*) fälschlich 1 liefern würde.',
  },
  {
    id: 'uni-7-rekursive-voraussetzungen',
    schemaId: 'uni',
    title: 'Indirekte & direkte Voraussetzungen (Rekursives SQL)',
    source: 'Klausurtraining (Kap. 4 & Blatt 6)',
    difficulty: 'Klausurniveau',
    topics: ['WITH RECURSIVE', 'Transitive Hülle'],
    prompt:
      'Bestimmen Sie mittels rekursivem SQL die Titel aller Vorlesungen (ohne Duplikate), die direkt oder indirekt für die Vorlesung \'Der Wiener Kreis\' vorausgesetzt werden. Sortieren Sie die Titel alphabetisch aufsteigend.',
    expectedColumns: ['Titel'],
    orderMatters: true,
    requiresDistinct: true,
    solutionSql: `WITH RECURSIVE vor(Vorgaenger, Nachfolger) AS (
  SELECT Vorgaenger, Nachfolger FROM voraussetzen
  UNION
  SELECT vs.Vorgaenger, v.Nachfolger
  FROM voraussetzen vs
  JOIN vor v ON vs.Nachfolger = v.Vorgaenger
)
SELECT DISTINCT vl.Titel
FROM vor
JOIN Vorlesungen ziel ON vor.Nachfolger = ziel.VorlNr
JOIN Vorlesungen vl ON vor.Vorgaenger = vl.VorlNr
WHERE ziel.Titel = 'Der Wiener Kreis'
ORDER BY vl.Titel ASC;`,
    hints: [
      'Berechnen Sie in einer WITH RECURSIVE-CTE die transitive Hülle der Relation voraussetzen.',
      'Verwenden Sie UNION (statt UNION ALL), um Duplikate bzw. potenzielle Zyklen zu vermeiden, und joinen Sie anschließend auf Vorlesungen für Start- und Zieltitel.',
    ],
    solutionExplanation:
      'Der Wiener Kreis (5259) setzt Wissenschaftstheorie (5052) voraus, diese setzt Ethik (5041) und Erkenntnistheorie (5043) voraus, und beide setzen Grundzüge (5001) voraus.',
  },
];
