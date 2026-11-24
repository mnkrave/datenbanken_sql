import type { Exercise, SchemaDef } from '../../types/sql';

export const unternehmenSchema: SchemaDef = {
  id: 'unternehmen',
  title: 'Angestellte & Abteilung (Unternehmen)',
  shortTitle: 'Angestellte',
  sheets: 'Übungsblatt 4 (Aufg. 2)',
  summary:
    'Kompaktes Unternehmens-Schema aus Übungsblatt 4 mit Abteilungen, Angestellten und einer rekursiven Vorgesetztenbeziehung (ChefNr).',
  explanationBullets: [
    'Die Relation Abteilung speichert Abteilungsnummer (AbteilNr), AbteilName und Standort (Ort).',
    'Die Relation Angestellte speichert PersonalNr, Name, Gehalt, Beruf, Zugehörigkeit zu einer Abteilung (AbteilNr), den direkten Vorgesetzten (ChefNr) und den Wohnort.',
    'ChefNr referenziert hierbei eine andere PersonalNr in derselben Tabelle Angestellte (oder ist NULL bei der obersten Führungskraft).',
  ],
  examNotes: [
    'Für Vergleiche zwischen Angestellten und ihren Chefs (Aufg. 2d) ist ein Self-Join über a.ChefNr = c.PersonalNr nötig.',
    'Aufg. 2f („In welchen Abteilungen sind alle Berufe des Unternehmens vertreten?“) ist ein klassisches Beispiel für die Relationale Division in SQL (doppeltes NOT EXISTS oder COUNT(DISTINCT Beruf)).',
  ],
  tables: [
    {
      name: 'Abteilung',
      description: 'Abteilungen des Unternehmens und deren Standort',
      columns: [
        { name: 'AbteilNr', type: 'INTEGER', isPk: true },
        { name: 'AbteilName', type: 'VARCHAR(50)' },
        { name: 'Ort', type: 'VARCHAR(50)' },
      ],
    },
    {
      name: 'Angestellte',
      description: 'Mitarbeiter mit Gehalt, Beruf, Abteilung und direktem Chef',
      columns: [
        { name: 'PersonalNr', type: 'INTEGER', isPk: true },
        { name: 'Name', type: 'VARCHAR(50)' },
        { name: 'Gehalt', type: 'NUMERIC(10,2)' },
        { name: 'Beruf', type: 'VARCHAR(50)' },
        { name: 'AbteilNr', type: 'INTEGER', fkTarget: 'Abteilung.AbteilNr' },
        { name: 'ChefNr', type: 'INTEGER', fkTarget: 'Angestellte.PersonalNr', note: 'NULL bei Geschäftsführung' },
        { name: 'Wohnort', type: 'VARCHAR(50)' },
      ],
    },
  ],
  seedSql: `
    CREATE TABLE Abteilung (
      AbteilNr INTEGER PRIMARY KEY,
      AbteilName VARCHAR(50) NOT NULL,
      Ort VARCHAR(50) NOT NULL
    );

    CREATE TABLE Angestellte (
      PersonalNr INTEGER PRIMARY KEY,
      Name VARCHAR(50) NOT NULL,
      Gehalt NUMERIC(10,2) NOT NULL,
      Beruf VARCHAR(50) NOT NULL,
      AbteilNr INTEGER NOT NULL REFERENCES Abteilung(AbteilNr),
      ChefNr INTEGER REFERENCES Angestellte(PersonalNr),
      Wohnort VARCHAR(50) NOT NULL
    );

    INSERT INTO Abteilung VALUES
      (10, 'Entwicklung', 'Darmstadt'),
      (20, 'Datenbanken', 'Mannheim'),
      (30, 'Beratung', 'Darmstadt'),
      (40, 'Forschung', 'Heidelberg');

    INSERT INTO Angestellte VALUES
      (1, 'Weber', 7200.00, 'Projektleiter', 10, NULL, 'Darmstadt'),
      (2, 'Keller', 7600.00, 'Programmierer', 10, 1, 'Mannheim'),
      (3, 'Bauer', 5800.00, 'Analyst', 10, 1, 'Heidelberg'),
      (4, 'Schulz', 6400.00, 'Projektleiter', 20, NULL, 'Mannheim'),
      (5, 'Hoffmann', 5200.00, 'Programmierer', 20, 4, 'Mannheim'),
      (6, 'Richter', 6800.00, 'Analyst', 20, 4, 'Ludwigshafen'),
      (7, 'Klein', 5400.00, 'Programmierer', 30, 1, 'Frankfurt'),
      (8, 'Neumann', 4900.00, 'Programmierer', 10, 2, 'Mannheim');
  `,
};

export const unternehmenExercises: Exercise[] = [
  {
    id: 'unt-1-abteilungen',
    schemaId: 'unternehmen',
    title: 'Nummern und Namen aller Abteilungen',
    source: 'Übungsblatt 4 · Aufg. 2(a)',
    difficulty: 'Basis',
    topics: ['SELECT', 'Projektion'],
    prompt: 'Geben Sie die AbteilNr und den AbteilName (in dieser Reihenfolge) aller Abteilungen aus.',
    expectedColumns: ['AbteilNr', 'AbteilName'],
    orderMatters: false,
    solutionSql: `SELECT AbteilNr, AbteilName
FROM Abteilung;`,
    hints: ['Einfache Projektion auf die beiden gesuchten Spalten von Abteilung.'],
    solutionExplanation: 'Entspricht direkt $\\Pi_{\\text{AbteilNr}, \\text{AbteilName}}(\\text{Abteilung})$.',
  },
  {
    id: 'unt-2-mannheim',
    schemaId: 'unternehmen',
    title: 'Angestellte mit Wohnort Mannheim',
    source: 'Übungsblatt 4 · Aufg. 2(b)',
    difficulty: 'Basis',
    topics: ['SELECT', 'WHERE'],
    prompt: 'Geben Sie Name und Beruf (in dieser Reihenfolge) aller Angestellten aus, die in \'Mannheim\' wohnen.',
    expectedColumns: ['Name', 'Beruf'],
    orderMatters: false,
    solutionSql: `SELECT Name, Beruf
FROM Angestellte
WHERE Wohnort = 'Mannheim';`,
    hints: ['Achten Sie darauf, auf Wohnort (nicht Abteilung.Ort) zu filtern.'],
    solutionExplanation: 'Wohnort ist direkt ein Attribut der Relation Angestellte.',
  },
  {
    id: 'unt-3-programmierer-darmstadt',
    schemaId: 'unternehmen',
    title: 'Programmierer in Darmstadt',
    source: 'Übungsblatt 4 · Aufg. 2(c)',
    difficulty: 'Basis',
    topics: ['JOIN', 'WHERE'],
    prompt:
      'Listen Sie Name, Gehalt und AbteilName (in dieser Reihenfolge) aller \'Programmierer\' auf, die in einer Abteilung am Standort \'Darmstadt\' beschäftigt sind.',
    expectedColumns: ['Name', 'Gehalt', 'AbteilName'],
    orderMatters: false,
    solutionSql: `SELECT a.Name, a.Gehalt, d.AbteilName
FROM Angestellte a
JOIN Abteilung d ON a.AbteilNr = d.AbteilNr
WHERE a.Beruf = 'Programmierer'
  AND d.Ort = 'Darmstadt';`,
    hints: [
      '„In Darmstadt beschäftigt“ bezieht sich auf den Standort der Abteilung (Abteilung.Ort), nicht auf den Wohnort!',
      'Verknüpfen Sie Angestellte und Abteilung über AbteilNr.',
    ],
    solutionExplanation:
      'Durch den Join über AbteilNr erhalten wir sowohl d.AbteilName als auch den Beschäftigungsort d.Ort = \'Darmstadt\'.',
  },
  {
    id: 'unt-4-mehr-als-chef',
    schemaId: 'unternehmen',
    title: 'Mehr Gehalt als der direkte Chef (Self-Join)',
    source: 'Übungsblatt 4 · Aufg. 2(d)',
    difficulty: 'Mittel',
    topics: ['Self-Join'],
    prompt:
      'Welche Angestellten verdienen mehr als ihre direkten Chefs? Geben Sie PersonalNr und Name (in dieser Reihenfolge) dieser Angestellten aus.',
    expectedColumns: ['PersonalNr', 'Name'],
    orderMatters: false,
    solutionSql: `SELECT a.PersonalNr, a.Name
FROM Angestellte a
JOIN Angestellte c ON a.ChefNr = c.PersonalNr
WHERE a.Gehalt > c.Gehalt;`,
    hints: [
      'Führen Sie einen Self-Join der Tabelle Angestellte mit zwei Aliasen (z. B. a für Angestellter und c für Chef) durch.',
      'Die Join-Bedingung lautet a.ChefNr = c.PersonalNr, die Vergleichsbedingung a.Gehalt > c.Gehalt.',
    ],
    solutionExplanation:
      'Keller (7600 > Weber 7200) und Richter (6800 > Schulz 6400) verdienen mehr als ihre direkten Vorgesetzten. Angestellte mit ChefNr IS NULL fallen beim Equi-Join automatisch weg.',
  },
  {
    id: 'unt-5-leere-abteilungen',
    schemaId: 'unternehmen',
    title: 'Abteilungen ohne Angestellte',
    source: 'Übungsblatt 4 · Aufg. 2(e)',
    difficulty: 'Mittel',
    topics: ['NOT EXISTS', 'EXCEPT', 'Anti-Join'],
    prompt: 'Welche Abteilungen haben keine Angestellten? Geben Sie deren AbteilNr aus.',
    expectedColumns: ['AbteilNr'],
    orderMatters: false,
    requiresDistinct: true,
    solutionSql: `SELECT d.AbteilNr
FROM Abteilung d
WHERE NOT EXISTS (
  SELECT *
  FROM Angestellte a
  WHERE a.AbteilNr = d.AbteilNr
);`,
    alternativeSolutions: [
      `SELECT AbteilNr FROM Abteilung EXCEPT SELECT AbteilNr FROM Angestellte;`,
    ],
    hints: ['Nutzen Sie NOT EXISTS oder EXCEPT zwischen Abteilung.AbteilNr und Angestellte.AbteilNr.'],
    solutionExplanation: 'Abteilung 40 (Forschung in Heidelberg) hat keine zugeordneten Angestellten.',
  },
  {
    id: 'unt-6-alle-berufe-division',
    schemaId: 'unternehmen',
    title: 'Abteilungen mit allen Berufen (Division / Allquantor)',
    source: 'Übungsblatt 4 · Aufg. 2(f)',
    difficulty: 'Klausurniveau',
    topics: ['Division', 'Allquantor', 'Doppeltes NOT EXISTS', 'COUNT(DISTINCT)'],
    prompt:
      'In welchen Abteilungen sind alle im Unternehmen vorkommenden Berufe vertreten? Geben Sie AbteilNr und AbteilName (in dieser Reihenfolge) aus.',
    expectedColumns: ['AbteilNr', 'AbteilName'],
    orderMatters: false,
    requiresDistinct: true,
    solutionSql: `SELECT d.AbteilNr, d.AbteilName
FROM Abteilung d
WHERE NOT EXISTS (
  SELECT *
  FROM Angestellte x
  WHERE NOT EXISTS (
    SELECT *
    FROM Angestellte a
    WHERE a.AbteilNr = d.AbteilNr
      AND a.Beruf = x.Beruf
  )
);`,
    alternativeSolutions: [
      `SELECT d.AbteilNr, d.AbteilName
FROM Abteilung d
JOIN Angestellte a ON d.AbteilNr = a.AbteilNr
GROUP BY d.AbteilNr, d.AbteilName
HAVING COUNT(DISTINCT a.Beruf) = (SELECT COUNT(DISTINCT Beruf) FROM Angestellte);`,
    ],
    hints: [
      'Variante 1 (Allquantor): „Es gibt keinen Beruf x im Unternehmen, der in Abteilung d nicht vorkommt“ → doppeltes NOT EXISTS.',
      'Variante 2 (Zählen): Gruppieren Sie nach Abteilung und prüfen Sie HAVING COUNT(DISTINCT a.Beruf) = (SELECT COUNT(DISTINCT Beruf) FROM Angestellte).',
    ],
    solutionExplanation:
      'Im Unternehmen gibt es 3 Berufe (Projektleiter, Programmierer, Analyst). Sowohl Abteilung 10 (Entwicklung) als auch Abteilung 20 (Datenbanken) decken alle drei ab; Beratung (30) hat nur Programmierer.',
  },
  {
    id: 'unt-7-avg-gehalt-abteilung',
    schemaId: 'unternehmen',
    title: 'Durchschnittsgehalt pro Abteilung',
    source: 'Klausurtraining (GROUP BY + AVG)',
    difficulty: 'Basis',
    topics: ['JOIN', 'GROUP BY', 'AVG', 'ROUND'],
    prompt:
      'Berechnen Sie für jede Abteilung mit mindestens einem Angestellten den `AbteilName` und das auf 2 Nachkommastellen gerundete Durchschnittsgehalt (`ROUND(AVG(Gehalt), 2)`). Sortieren Sie absteigend nach dem Durchschnittsgehalt.',
    expectedColumns: ['AbteilName', 'AvgGehalt'],
    orderMatters: true,
    solutionSql: `SELECT d.AbteilName, ROUND(AVG(a.Gehalt), 2) AS AvgGehalt
FROM Abteilung d
JOIN Angestellte a ON d.AbteilNr = a.AbteilNr
GROUP BY d.AbteilNr, d.AbteilName
ORDER BY AvgGehalt DESC;`,
    hints: ['Verknüpfen Sie `Abteilung` und `Angestellte` über `AbteilNr` und gruppieren Sie nach Abteilung.'],
    solutionExplanation: 'Entwicklung (6375 €) liegt vor Datenbanken (6133,33 €) und Beratung (5400 €).',
  },
  {
    id: 'unt-8-ohne-chef',
    schemaId: 'unternehmen',
    title: 'Angestellte ohne direkten Chef (NULL-Prüfung)',
    source: 'Klausurtraining (NULL-Semantik / 3VL)',
    difficulty: 'Basis',
    topics: ['NULL-Semantik / 3VL', 'WHERE'],
    prompt:
      'Welche Angestellten haben keinen direkten Vorgesetzten (`ChefNr` ist `NULL`)? Geben Sie `Name` und `Beruf` alphabetisch nach `Name` sortiert aus.',
    expectedColumns: ['Name', 'Beruf'],
    orderMatters: true,
    solutionSql: `SELECT Name, Beruf
FROM Angestellte
WHERE ChefNr IS NULL
ORDER BY Name ASC;`,
    hints: [
      'Klausurfalle 3VL (Blatt 5 Aufg. 4d): `ChefNr = NULL` ergibt immer `unknown` (leeres Ergebnis)! Verwenden Sie `ChefNr IS NULL`.',
    ],
    solutionExplanation: 'Schulz und Weber haben `ChefNr IS NULL`.',
  },
  {
    id: 'unt-9-pendler',
    schemaId: 'unternehmen',
    title: 'Pendler: Wohnort ungleich Abteilungsort',
    source: 'Klausurtraining (JOIN + <>)',
    difficulty: 'Basis',
    topics: ['JOIN', 'WHERE'],
    prompt:
      'Geben Sie `Name`, `Wohnort` und `Ort` (der Abteilung) aller Angestellten aus, die in einer anderen Stadt wohnen als dem Standort ihrer Abteilung. Sortieren Sie alphabetisch nach `Name`.',
    expectedColumns: ['Name', 'Wohnort', 'Abteilungsort'],
    orderMatters: true,
    solutionSql: `SELECT a.Name, a.Wohnort, d.Ort AS Abteilungsort
FROM Angestellte a
JOIN Abteilung d ON a.AbteilNr = d.AbteilNr
WHERE a.Wohnort <> d.Ort
ORDER BY a.Name ASC;`,
    hints: ['Vergleichen Sie nach dem Join `a.Wohnort <> d.Ort`.'],
    solutionExplanation: 'Bauer, Keller, Klein, Neumann und Richter pendeln an einen anderen Arbeitsort.',
  },
  {
    id: 'unt-10-mitarbeiterzahl-inkl-0',
    schemaId: 'unternehmen',
    title: 'Mitarbeiterzahl pro Abteilung (inkl. leerer Abteilungen)',
    source: 'Klausurtraining (LEFT JOIN + COUNT)',
    difficulty: 'Mittel',
    topics: ['LEFT JOIN', 'GROUP BY', 'COUNT(Spalte)'],
    prompt:
      'Geben Sie für **jede** Abteilung deren `AbteilName` und die Anzahl ihrer Angestellten aus — auch für Abteilungen ohne Mitarbeiter (`0`). Sortieren Sie absteigend nach Anzahl und alphabetisch nach `AbteilName`.',
    expectedColumns: ['AbteilName', 'Anzahl'],
    orderMatters: true,
    solutionSql: `SELECT d.AbteilName, COUNT(a.PersonalNr) AS Anzahl
FROM Abteilung d
LEFT JOIN Angestellte a ON d.AbteilNr = a.AbteilNr
GROUP BY d.AbteilNr, d.AbteilName
ORDER BY Anzahl DESC, d.AbteilName ASC;`,
    hints: ['Nutzen Sie `LEFT JOIN` und `COUNT(a.PersonalNr)` (nicht `COUNT(*)`!).'],
    solutionExplanation: 'Forschung (Abt. 40) erscheint dank `LEFT JOIN` und `COUNT(a.PersonalNr)` korrekt mit `0`.',
  },
  {
    id: 'unt-11-ueber-abteilungsdurchschnitt',
    schemaId: 'unternehmen',
    title: 'Überdurchschnittlich bezahlte Angestellte je Abteilung',
    source: 'Klausurtraining (Korrelierte Unterabfrage)',
    difficulty: 'Klausurniveau',
    topics: ['Korrelierte Unterabfrage', 'AVG'],
    prompt:
      'Finden Sie alle Angestellten, deren Gehalt strikt über dem Durchschnittsgehalt ihrer **eigenen** Abteilung liegt. Geben Sie `Name`, `Gehalt` und `AbteilNr` (in dieser Reihenfolge) absteigend nach `Gehalt` sortiert aus.',
    expectedColumns: ['Name', 'Gehalt', 'AbteilNr'],
    orderMatters: true,
    solutionSql: `SELECT a.Name, a.Gehalt, a.AbteilNr
FROM Angestellte a
WHERE a.Gehalt > (
  SELECT AVG(a2.Gehalt)
  FROM Angestellte a2
  WHERE a2.AbteilNr = a.AbteilNr
)
ORDER BY a.Gehalt DESC;`,
    hints: [
      'Korrelieren Sie die Unterabfrage über `a2.AbteilNr = a.AbteilNr` und vergleichen Sie `a.Gehalt > (SELECT AVG(a2.Gehalt) ...)`.',
    ],
    solutionExplanation:
      'In Abteilung 10 (Ø 6375 €) liegen Keller und Weber darüber; in Abteilung 20 (Ø 6133,33 €) Richter und Schulz.',
  },
  {
    id: 'unt-12-chefs-mit-mindestens-2',
    schemaId: 'unternehmen',
    title: 'Vorgesetzte mit mindestens 2 direkten Untergebenen',
    source: 'Klausurtraining (Self-Join + HAVING)',
    difficulty: 'Mittel',
    topics: ['Self-Join', 'GROUP BY', 'HAVING'],
    prompt:
      'Welche Angestellten sind direkte Vorgesetzte von mindestens 2 Mitarbeitern? Geben Sie `Name` des Vorgesetzten und die Anzahl seiner direkten Untergebenen absteigend nach Anzahl sortiert aus.',
    expectedColumns: ['Name', 'Anzahl'],
    orderMatters: true,
    solutionSql: `SELECT c.Name, COUNT(*) AS Anzahl
FROM Angestellte c
JOIN Angestellte a ON a.ChefNr = c.PersonalNr
GROUP BY c.PersonalNr, c.Name
HAVING COUNT(*) >= 2
ORDER BY Anzahl DESC;`,
    hints: ['Verknüpfen Sie Chef `c` und Untergebenen `a` über `a.ChefNr = c.PersonalNr` und nutzen Sie `HAVING COUNT(*) >= 2`.'],
    solutionExplanation: 'Weber leitet 3 Mitarbeiter direkt (Keller, Bauer, Klein), Schulz 2 (Hoffmann, Richter).',
  },
  {
    id: 'unt-13-gehaltsrang-pro-abteilung',
    schemaId: 'unternehmen',
    title: 'Gehalts-Rangliste pro Abteilung (PARTITION BY)',
    source: 'Klausurtraining (Window Function + PARTITION BY)',
    difficulty: 'Klausurniveau',
    topics: ['Window Function', 'PARTITION BY', 'RANK() OVER'],
    prompt:
      'Erstellen Sie **innerhalb jeder Abteilung** eine Rangliste der Angestellten absteigend nach Gehalt (höchstes Gehalt der Abteilung = Rang 1). Geben Sie `AbteilName`, `Name`, `Gehalt` und `Rang` sortiert nach `AbteilName` aufsteigend und `Rang` aufsteigend aus.',
    expectedColumns: ['AbteilName', 'Name', 'Gehalt', 'Rang'],
    orderMatters: true,
    solutionSql: `SELECT d.AbteilName, a.Name, a.Gehalt,
       RANK() OVER (PARTITION BY a.AbteilNr ORDER BY a.Gehalt DESC) AS Rang
FROM Angestellte a
JOIN Abteilung d ON a.AbteilNr = d.AbteilNr
ORDER BY d.AbteilName ASC, Rang ASC;`,
    hints: [
      'Verwenden Sie `RANK() OVER (PARTITION BY a.AbteilNr ORDER BY a.Gehalt DESC)` (die 3 Window-Konzepte aus VL 19: `PARTITION BY`, `ORDER BY`, Framing).',
    ],
    solutionExplanation:
      '`PARTITION BY a.AbteilNr` startet die Rangzählung für jede Abteilung separat bei 1.',
  },
];
