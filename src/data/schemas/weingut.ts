import type { Exercise, SchemaDef } from '../../types/sql';

export const weingutSchema: SchemaDef = {
  id: 'weingut',
  title: 'Weingut-Datenbank',
  shortTitle: 'Weingut',
  sheets: 'Übungsblatt 3 (Aufg. 4) · Übungsblatt 4 (Aufg. 1)',
  summary:
    'In der Datenbank eines Weinguts werden Rebsorten, konkrete Weine sowie deren jährliche Jahrgänge mit Preis und Qualitätsbewertung verwaltet.',
  explanationBullets: [
    'In der Tabelle Rebsorte werden die verschiedenen Rebsorten mit eindeutiger Nummer (Sorte), Name und Farbe (z. B. Rot, Weiß) gespeichert.',
    'Die verschiedenen Weine werden in der Tabelle Wein verwaltet. Jeder Wein ist über den Fremdschlüssel RSorte genau einer Rebsorte zugeordnet.',
    'Für jeden Jahrgang wird in der Tabelle Jahrgang pro Wein (WeinID) und Jahr ein Preis sowie die Qualitaet vermerkt.',
    'Die Qualitäten „exzellent“, „sehr gut“ und „gut“ usw. werden auf die Ordinalzahlen 1, 2, 3 usw. abgebildet (1 = exzellent).',
  ],
  examNotes: [
    'Aus Portabilitätsgründen heißt die Spalte in SQL Qualitaet (ohne Umlaut).',
    'Achten Sie bei „ausschließlich Qualität = 1“ (Aufg. e) darauf, ob Weine ohne jeglichen Jahrgang (z. B. Marbuzet!) ausgeschlossen werden sollen — in der Musterlösung von Blatt 3/4 wird über die Tabelle Jahrgang iteriert.',
  ],
  tables: [
    {
      name: 'Rebsorte',
      description: 'Verwaltete Rebsorten mit Farbe',
      columns: [
        { name: 'Sorte', type: 'INTEGER', isPk: true },
        { name: 'Name', type: 'VARCHAR(50)' },
        { name: 'Farbe', type: 'VARCHAR(20)' },
      ],
    },
    {
      name: 'Wein',
      description: 'Weine des Weinguts',
      columns: [
        { name: 'ID', type: 'INTEGER', isPk: true },
        { name: 'Name', type: 'VARCHAR(80)' },
        { name: 'RSorte', type: 'INTEGER', fkTarget: 'Rebsorte.Sorte' },
      ],
    },
    {
      name: 'Jahrgang',
      description: 'Jahrgänge mit Preis und Qualitätsstufe (1 = exzellent)',
      columns: [
        { name: 'WeinID', type: 'INTEGER', isPk: true, fkTarget: 'Wein.ID' },
        { name: 'Jahr', type: 'INTEGER', isPk: true },
        { name: 'Preis', type: 'NUMERIC(6,2)' },
        { name: 'Qualitaet', type: 'INTEGER', note: '1=exzellent, 2=sehr gut, 3=gut' },
      ],
    },
  ],
  seedSql: `
    CREATE TABLE Rebsorte (
      Sorte INTEGER PRIMARY KEY,
      Name VARCHAR(50) NOT NULL,
      Farbe VARCHAR(20) NOT NULL
    );

    CREATE TABLE Wein (
      ID INTEGER PRIMARY KEY,
      Name VARCHAR(80) NOT NULL,
      RSorte INTEGER NOT NULL REFERENCES Rebsorte(Sorte)
    );

    CREATE TABLE Jahrgang (
      WeinID INTEGER NOT NULL REFERENCES Wein(ID),
      Jahr INTEGER NOT NULL,
      Preis NUMERIC(6,2) NOT NULL,
      Qualitaet INTEGER NOT NULL,
      PRIMARY KEY (WeinID, Jahr)
    );

    INSERT INTO Rebsorte VALUES
      (1, 'Merlot', 'Rot'),
      (2, 'Riesling', 'Weiß'),
      (3, 'Spätburgunder', 'Rot'),
      (4, 'Chardonnay', 'Weiß'),
      (5, 'Dornfelder', 'Rot');

    INSERT INTO Wein VALUES
      (1, 'Marbuzet', 1),
      (2, 'Dr. Bassermann-Jordan', 2),
      (3, 'Herrgottsacker', 2),
      (4, 'Kirchenstück', 2),
      (5, 'Schlossberg Reserve', 4);

    INSERT INTO Jahrgang VALUES
      (2, 2003, 20.00, 1),
      (2, 2004, 14.00, 2),
      (3, 2001, 50.00, 1),
      (3, 2005, 55.00, 1),
      (4, 2006, 32.00, 3),
      (5, 2004, 28.00, 1);
  `,
};

export const weingutExercises: Exercise[] = [
  {
    id: 'weingut-1-merlot-farbe',
    schemaId: 'weingut',
    title: 'Farbe der Rebsorte Merlot',
    source: 'Übungsblatt 3 Aufg. 4(a) · Blatt 4 Aufg. 1(a)',
    difficulty: 'Basis',
    topics: ['SELECT', 'WHERE'],
    prompt: 'Geben Sie die Farbe der Rebsorte \'Merlot\' an.',
    expectedColumns: ['Farbe'],
    orderMatters: false,
    solutionSql: `SELECT Farbe
FROM Rebsorte
WHERE Name = 'Merlot';`,
    hints: ['Eine einfache Selektion + Projektion auf der Tabelle Rebsorte genügt.'],
    solutionExplanation:
      'Entspricht direkt $\\Pi_{\\text{Farbe}}(\\sigma_{\\text{Name}=\\text{\'Merlot\'}}(\\text{Rebsorte}))$ aus Blatt 3.',
  },
  {
    id: 'weingut-2-bassermann-rebsorte',
    schemaId: 'weingut',
    title: 'Rebsorte eines bestimmten Weins',
    source: 'Übungsblatt 3 Aufg. 4(b) · Blatt 4 Aufg. 1(b)',
    difficulty: 'Basis',
    topics: ['JOIN'],
    prompt: 'Aus welcher Rebsorte (Name der Rebsorte) ist der Wein mit dem Namen \'Dr. Bassermann-Jordan\' gemacht?',
    expectedColumns: ['Name'],
    orderMatters: false,
    solutionSql: `SELECT r.Name
FROM Rebsorte r
JOIN Wein w ON r.Sorte = w.RSorte
WHERE w.Name = 'Dr. Bassermann-Jordan';`,
    hints: [
      'Verknüpfen Sie Rebsorte und Wein über r.Sorte = w.RSorte.',
      'Qualifizieren Sie die Spalte Name mit dem Tabellenalias (r.Name vs. w.Name), da beide Tabellen eine Spalte Name haben!',
    ],
    solutionExplanation: 'Durch den Join über Sorte = RSorte finden wir die zugehörige Rebsorte Riesling.',
  },
  {
    id: 'weingut-3-riesling-preise',
    schemaId: 'weingut',
    title: 'Namen und Preise aller Riesling-Weine',
    source: 'Übungsblatt 3 Aufg. 4(c) · Blatt 4 Aufg. 1(c)',
    difficulty: 'Basis',
    topics: ['3-Wege-JOIN'],
    prompt:
      'Listen Sie den Namen des Weins und den jeweiligen Preis (in dieser Reihenfolge) aller Jahrgänge von \'Riesling\'-Weinen auf. Sortieren Sie alphabetisch nach Weinname und aufsteigend nach Preis.',
    expectedColumns: ['Name', 'Preis'],
    orderMatters: true,
    solutionSql: `SELECT w.Name, j.Preis
FROM Rebsorte r
JOIN Wein w ON r.Sorte = w.RSorte
JOIN Jahrgang j ON w.ID = j.WeinID
WHERE r.Name = 'Riesling'
ORDER BY w.Name ASC, j.Preis ASC;`,
    hints: [
      'Sie benötigen alle drei Tabellen: Rebsorte → Wein → Jahrgang.',
      'Beachten Sie die Join-Bedingungen r.Sorte = w.RSorte und w.ID = j.WeinID.',
    ],
    solutionExplanation: 'Verbindet alle drei Relationen des Weingut-Schemas und projiziert auf w.Name und j.Preis.',
  },
  {
    id: 'weingut-4-rebsorten-ohne-wein',
    schemaId: 'weingut',
    title: 'Rebsorten ohne Weine (Anti-Join)',
    source: 'Übungsblatt 3 Aufg. 4(d) · Blatt 4 Aufg. 1(d)',
    difficulty: 'Mittel',
    topics: ['NOT EXISTS', 'Anti-Join', 'EXCEPT'],
    prompt: 'Für welche Rebsorten sind keine Weine in der Datenbank? Geben Sie deren Namen aus.',
    expectedColumns: ['Name'],
    orderMatters: false,
    requiresDistinct: true,
    solutionSql: `SELECT r.Name
FROM Rebsorte r
WHERE NOT EXISTS (
  SELECT *
  FROM Wein w
  WHERE w.RSorte = r.Sorte
);`,
    alternativeSolutions: [
      `SELECT Name FROM Rebsorte WHERE Sorte NOT IN (SELECT RSorte FROM Wein);`,
      `SELECT r.Name FROM Rebsorte r LEFT JOIN Wein w ON r.Sorte = w.RSorte WHERE w.ID IS NULL;`,
    ],
    hints: [
      'In der Relationalen Algebra ist das ein Anti-Join ($\\triangleright$). In SQL formulieren Sie das am sichersten mit `WHERE NOT EXISTS`.',
      'Alternativ funktioniert auch ein `LEFT JOIN` mit `WHERE w.ID IS NULL`.',
    ],
    solutionExplanation:
      'Spätburgunder (Sorte 3) und Dornfelder (Sorte 5) werden von keinem Wein referenziert und erscheinen im Ergebnis.',
  },
  {
    id: 'weingut-5-ausschliesslich-exzellent',
    schemaId: 'weingut',
    title: 'Weine mit ausschließlich exzellenter Qualität',
    source: 'Übungsblatt 3 Aufg. 4(e) · Blatt 4 Aufg. 1(e)',
    difficulty: 'Klausurniveau',
    topics: ['Allquantor', 'EXCEPT', 'NOT EXISTS'],
    prompt:
      'Welche Weine (die mindestens einen Jahrgang in der Tabelle Jahrgang haben) besitzen ausschließlich exzellente Qualität (Qualitaet = 1)? Listen Sie deren WeinID (ohne Duplikate) auf.',
    expectedColumns: ['WeinID'],
    orderMatters: false,
    requiresDistinct: true,
    solutionSql: `SELECT DISTINCT j1.WeinID
FROM Jahrgang j1
WHERE NOT EXISTS (
  SELECT *
  FROM Jahrgang j2
  WHERE j2.WeinID = j1.WeinID
    AND j2.Qualitaet <> 1
);`,
    alternativeSolutions: [
      `(SELECT WeinID FROM Jahrgang) EXCEPT (SELECT WeinID FROM Jahrgang WHERE Qualitaet <> 1);`,
      `SELECT WeinID FROM Jahrgang GROUP BY WeinID HAVING MIN(Qualitaet) = 1 AND MAX(Qualitaet) = 1;`,
    ],
    hints: [
      'Denken Sie an die Lösung aus Blatt 3: Alle WeinIDs aus Jahrgang MINUS alle WeinIDs, die mindestens einen Jahrgang mit Qualitaet <> 1 haben.',
      'In SQL: EXCEPT, doppelte Negation mit NOT EXISTS oder GROUP BY WeinID HAVING MAX(Qualitaet) = 1 AND MIN(Qualitaet) = 1.',
    ],
    solutionExplanation:
      'Dr. Bassermann-Jordan (ID 2) hat sowohl Qualität 1 als auch 2 und scheidet aus. Marbuzet (ID 1) hat gar keinen Jahrgang. Nur ID 3 und ID 5 haben ausschließlich Qualität 1.',
  },
  {
    id: 'weingut-6-teure-rebsorten',
    schemaId: 'weingut',
    title: 'Durchschnittspreis pro Rebsorte (HAVING)',
    source: 'Klausurtraining (nach Blatt 3 & 5)',
    difficulty: 'Mittel',
    topics: ['GROUP BY', 'HAVING', 'AVG', 'ROUND'],
    prompt:
      'Geben Sie für jede Rebsorte, deren Jahrgänge einen Durchschnittspreis von mehr als 25 Euro haben, den Namen der Rebsorte und den auf 2 Nachkommastellen gerundeten Durchschnittspreis (ROUND(AVG(...), 2)) aus. Sortieren Sie absteigend nach dem Durchschnittspreis.',
    expectedColumns: ['Name', 'AvgPreis'],
    orderMatters: true,
    solutionSql: `SELECT r.Name, ROUND(AVG(j.Preis), 2) AS AvgPreis
FROM Rebsorte r
JOIN Wein w ON r.Sorte = w.RSorte
JOIN Jahrgang j ON w.ID = j.WeinID
GROUP BY r.Sorte, r.Name
HAVING AVG(j.Preis) > 25
ORDER BY AvgPreis DESC;`,
    hints: [
      'Gruppieren Sie nach Rebsorte (r.Sorte, r.Name) und filtern Sie Gruppenbedingungen mit HAVING (nicht WHERE!).',
      'Nutzen Sie ROUND(AVG(j.Preis), 2) für die Ausgabe auf 2 Nachkommastellen.',
    ],
    solutionExplanation:
      'Aggregatbedingungen wie AVG(j.Preis) > 25 gehören immer in die HAVING-Klausel nach GROUP BY.',
  },
  {
    id: 'weingut-7-weine-ohne-jahrgang',
    schemaId: 'weingut',
    title: 'Weine ohne eingetragenen Jahrgang',
    source: 'Klausurtraining (Anti-Join)',
    difficulty: 'Basis',
    topics: ['NOT EXISTS', 'Anti-Join'],
    prompt:
      'Welche Weine aus der Tabelle `Wein` besitzen bisher keinen einzigen Jahrgang in der Tabelle `Jahrgang`? Geben Sie deren `Name` aus.',
    expectedColumns: ['Name'],
    orderMatters: false,
    solutionSql: `SELECT w.Name
FROM Wein w
WHERE NOT EXISTS (
  SELECT *
  FROM Jahrgang j
  WHERE j.WeinID = w.ID
);`,
    hints: ['Prüfen Sie mit `WHERE NOT EXISTS` gegen `Jahrgang` über `j.WeinID = w.ID`.'],
    solutionExplanation: 'Nur Marbuzet (ID 1) hat noch keinen Jahrgangseintrag.',
  },
  {
    id: 'weingut-8-anzahl-weine-pro-farbe',
    schemaId: 'weingut',
    title: 'Anzahl der Weine pro Farbe',
    source: 'Klausurtraining (GROUP BY + COUNT)',
    difficulty: 'Basis',
    topics: ['JOIN', 'GROUP BY', 'COUNT'],
    prompt:
      'Wie viele Weine gibt es jeweils pro Rebsorten-`Farbe` (`Rot`, `Weiß`)? Geben Sie `Farbe` und `AnzahlWeine` alphabetisch nach `Farbe` sortiert aus.',
    expectedColumns: ['Farbe', 'AnzahlWeine'],
    orderMatters: true,
    solutionSql: `SELECT r.Farbe, COUNT(w.ID) AS AnzahlWeine
FROM Rebsorte r
LEFT JOIN Wein w ON r.Sorte = w.RSorte
GROUP BY r.Farbe
ORDER BY r.Farbe ASC;`,
    hints: ['Gruppieren Sie nach `r.Farbe` und zählen Sie `COUNT(w.ID)`.'],
    solutionExplanation: 'Es gibt 1 Rotwein (Marbuzet) und 4 Weißweine.',
  },
  {
    id: 'weingut-9-max-preis-pro-jahr',
    schemaId: 'weingut',
    title: 'Höchster Weinpreis pro Jahrgang',
    source: 'Klausurtraining (GROUP BY + MAX)',
    difficulty: 'Basis',
    topics: ['GROUP BY', 'MAX', 'ORDER BY'],
    prompt:
      'Geben Sie für jedes in `Jahrgang` vorkommende `Jahr` den maximalen Preis (`MAX(Preis)`) aufsteigend nach `Jahr` sortiert aus.',
    expectedColumns: ['Jahr', 'MaxPreis'],
    orderMatters: true,
    solutionSql: `SELECT Jahr, MAX(Preis) AS MaxPreis
FROM Jahrgang
GROUP BY Jahr
ORDER BY Jahr ASC;`,
    hints: ['Gruppieren Sie direkt in `Jahrgang` nach `Jahr`.'],
    solutionExplanation: 'Im Jahr 2004 gibt es zwei Einträge (14 € und 28 €), sodass `MAX(Preis)` 28,00 € liefert.',
  },
  {
    id: 'weingut-10-weine-mehrere-jahrgaenge',
    schemaId: 'weingut',
    title: 'Weine mit mehreren Jahrgängen',
    source: 'Klausurtraining (HAVING)',
    difficulty: 'Mittel',
    topics: ['JOIN', 'GROUP BY', 'HAVING'],
    prompt:
      'Welche Weine sind mit mehr als einem Jahrgang in der Datenbank vertreten? Geben Sie den Namen des Weins und die Anzahl der Jahrgänge (`Name`, `Anzahl`) alphabetisch nach `Name` sortiert aus.',
    expectedColumns: ['Name', 'Anzahl'],
    orderMatters: true,
    solutionSql: `SELECT w.Name, COUNT(*) AS Anzahl
FROM Wein w
JOIN Jahrgang j ON w.ID = j.WeinID
GROUP BY w.ID, w.Name
HAVING COUNT(*) > 1
ORDER BY w.Name ASC;`,
    hints: ['Gruppieren Sie nach `(w.ID, w.Name)` und filtern Sie mit `HAVING COUNT(*) > 1`.'],
    solutionExplanation: 'Dr. Bassermann-Jordan (2003, 2004) und Herrgottsacker (2001, 2005) haben je 2 Jahrgänge.',
  },
  {
    id: 'weingut-11-preissteigerung-selfjoin',
    schemaId: 'weingut',
    title: 'Weine mit Preissteigerung im Zeitverlauf (Self-Join)',
    source: 'Klausurtraining (Self-Join)',
    difficulty: 'Mittel',
    topics: ['Self-Join', 'JOIN'],
    prompt:
      'Welche Weine hatten in einem späteren Jahr einen höheren Preis als in einem früheren Jahr? Geben Sie `Name`, das frühere `Jahr` und das spätere `Jahr` (Spalten: `Name`, `FrueheresJahr`, `SpaeteresJahr`) aus.',
    expectedColumns: ['Name', 'FrueheresJahr', 'SpaeteresJahr'],
    orderMatters: false,
    solutionSql: `SELECT w.Name, j1.Jahr AS FrueheresJahr, j2.Jahr AS SpaeteresJahr
FROM Wein w
JOIN Jahrgang j1 ON w.ID = j1.WeinID
JOIN Jahrgang j2 ON w.ID = j2.WeinID
WHERE j1.Jahr < j2.Jahr
  AND j2.Preis > j1.Preis;`,
    hints: [
      'Joinen Sie `Jahrgang` zweimal (`j1` und `j2`) für denselben Wein (`j1.WeinID = j2.WeinID`).',
      'Vergleichen Sie `j1.Jahr < j2.Jahr AND j2.Preis > j1.Preis`.',
    ],
    solutionExplanation:
      'Herrgottsacker stieg von 50,00 € (2001) auf 55,00 € (2005), während Dr. Bassermann-Jordan von 2003 auf 2004 günstiger wurde.',
  },
  {
    id: 'weingut-12-weisswein-rangliste',
    schemaId: 'weingut',
    title: 'Preis-Rangliste exzellenter Weißweine',
    source: 'Klausurtraining (Window Function)',
    difficulty: 'Mittel',
    topics: ['Window Function', 'RANK() OVER', '3-Wege-JOIN'],
    prompt:
      'Erstellen Sie eine Rangliste aller Jahrgänge von Weißweinen (`Farbe = \'Weiß\'`) mit exzellenter Qualität (`Qualitaet = 1`), absteigend sortiert nach `Preis` (teuerster = Rang 1). Geben Sie `Name` (des Weins), `Jahr`, `Preis` und `Rang` aufsteigend nach `Rang` aus.',
    expectedColumns: ['Name', 'Jahr', 'Preis', 'Rang'],
    orderMatters: true,
    solutionSql: `SELECT w.Name, j.Jahr, j.Preis, RANK() OVER (ORDER BY j.Preis DESC) AS Rang
FROM Rebsorte r
JOIN Wein w ON r.Sorte = w.RSorte
JOIN Jahrgang j ON w.ID = j.WeinID
WHERE r.Farbe = 'Weiß'
  AND j.Qualitaet = 1
ORDER BY Rang ASC;`,
    hints: [
      'Filtern Sie zuerst auf `r.Farbe = \'Weiß\' AND j.Qualitaet = 1` und wenden Sie dann `RANK() OVER (ORDER BY j.Preis DESC)` an.',
    ],
    solutionExplanation:
      'Herrgottsacker 2005 (55 €) belegt Rang 1, gefolgt von Herrgottsacker 2001 (50 €), Schlossberg Reserve 2004 (28 €) und Dr. Bassermann-Jordan 2003 (20 €).',
  },
  {
    id: 'weingut-13-teurer-als-alle-nicht-exzellenten',
    schemaId: 'weingut',
    title: 'Teurer als ALLE nicht-exzellenten Jahrgänge (> ALL)',
    source: 'Klausurtraining (> ALL)',
    difficulty: 'Klausurniveau',
    topics: ['> ALL', 'Unterabfrage', 'DISTINCT'],
    prompt:
      'Geben Sie die Namen (ohne Duplikate) aller Weine aus, für die mindestens ein Jahrgang existiert, der strikt teurer ist als **alle** Jahrgänge mit `Qualitaet >= 2`.',
    expectedColumns: ['Name'],
    orderMatters: false,
    requiresDistinct: true,
    solutionSql: `SELECT DISTINCT w.Name
FROM Wein w
JOIN Jahrgang j ON w.ID = j.WeinID
WHERE j.Preis > ALL (
  SELECT Preis
  FROM Jahrgang
  WHERE Qualitaet >= 2
);`,
    hints: [
      'Nutzen Sie `j.Preis > ALL (SELECT Preis FROM Jahrgang WHERE Qualitaet >= 2)` (oder `> (SELECT MAX(Preis) ...)`).',
    ],
    solutionExplanation:
      'Der teuerste Jahrgang mit Qualität ≥ 2 ist Kirchenstück 2006 (32 €). Nur Herrgottsacker (50 € und 55 €) übertrifft diesen Wert.',
  },
];
