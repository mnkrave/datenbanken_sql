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
];
