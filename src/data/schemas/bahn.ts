import type { Exercise, SchemaDef } from '../../types/sql';

export const bahnSchema: SchemaDef = {
  id: 'bahn',
  title: 'Streckennetz einer Bahngesellschaft',
  shortTitle: 'Bahngesellschaft',
  sheets: 'Übungsblatt 3 (Aufg. 5) · Blatt 5 (Aufg. 3) · Blatt 6 (Aufg. 2)',
  summary:
    'Die Informationen über das Streckennetz einer Bahngesellschaft werden in den drei Relationen Zug, Verbindung und Teilstrecke gespeichert.',
  explanationBullets: [
    'Die Relation Zug enthält Informationen über den Zugtyp eines Zuges (z. B. ICE, IC, RE).',
    'In Verbindung ist vermerkt, an welchen Wochentagen (1 = Montag bis 7 = Sonntag) ein Zug verkehrt und in welchem Bahnhof er startet (StartBhf) und endet (ZielBhf).',
    'Da ein Zug in der Regel mehrere Teilstrecken während einer Reise absolviert, existiert die Relation Teilstrecke (z. B. Hamburg Hbf → Hannover Hbf, Hannover Hbf → Kassel-Wilhelmshöhe, Kassel-Wilhelmshöhe → Frankfurt Hbf).',
    'In Teilstrecke sind außerdem der Preis einer Fahrkarte, die Entfernung (km) sowie AbfahrtZeit und AnkunftZeit gespeichert.',
  ],
  examNotes: [
    'Primärschlüssel: Zug(ZugNr), Verbindung(ZugNr, Wochentag), Teilstrecke(ZugNr, Wochentag, vonBhf).',
    'Achten Sie auf den Unterschied zwischen einer gesamten Verbindung (StartBhf → ZielBhf) und einer einzelnen direkten Teilstrecke (vonBhf → nachBhf)!',
    'Blatt 5 Aufg. 3 Klausurfalle: Ein unkorreliertes WHERE EXISTS (...) liefert entweder alle oder gar keine Tupel!',
  ],
  tables: [
    {
      name: 'Zug',
      description: 'Züge und deren Zugtyp (ICE, IC, RE)',
      columns: [
        { name: 'ZugNr', type: 'INTEGER', isPk: true },
        { name: 'Zugtyp', type: 'VARCHAR(10)' },
      ],
    },
    {
      name: 'Verbindung',
      description: 'Gesamtverbindung eines Zuges an einem Wochentag (1–7)',
      columns: [
        { name: 'ZugNr', type: 'INTEGER', isPk: true, fkTarget: 'Zug.ZugNr' },
        { name: 'Wochentag', type: 'INTEGER', isPk: true, note: '1 = Mo ... 7 = So' },
        { name: 'StartBhf', type: 'VARCHAR(50)' },
        { name: 'ZielBhf', type: 'VARCHAR(50)' },
      ],
    },
    {
      name: 'Teilstrecke',
      description: 'Einzelabschnitte einer Zugverbindung mit Preis, Zeit und Entfernung',
      columns: [
        { name: 'ZugNr', type: 'INTEGER', isPk: true, fkTarget: 'Verbindung.ZugNr' },
        { name: 'Wochentag', type: 'INTEGER', isPk: true, fkTarget: 'Verbindung.Wochentag' },
        { name: 'vonBhf', type: 'VARCHAR(50)', isPk: true },
        { name: 'nachBhf', type: 'VARCHAR(50)' },
        { name: 'AbfahrtZeit', type: 'TIME' },
        { name: 'AnkunftZeit', type: 'TIME' },
        { name: 'Preis', type: 'NUMERIC(6,2)' },
        { name: 'Entfernung', type: 'INTEGER', note: 'in km' },
      ],
    },
  ],
  seedSql: `
    CREATE TABLE Zug (
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
      Preis NUMERIC(6,2) NOT NULL,
      Entfernung INTEGER NOT NULL,
      PRIMARY KEY (ZugNr, Wochentag, vonBhf),
      FOREIGN KEY (ZugNr, Wochentag) REFERENCES Verbindung(ZugNr, Wochentag) ON DELETE CASCADE
    );

    INSERT INTO Zug VALUES
      (101, 'ICE'),
      (102, 'ICE'),
      (201, 'IC'),
      (202, 'IC'),
      (301, 'RE'),
      (302, 'RE');

    INSERT INTO Verbindung VALUES
      (101, 1, 'Mannheim Hbf', 'Frankfurt Hbf'),
      (101, 2, 'Mannheim Hbf', 'Karlsruhe Hbf'),
      (102, 1, 'München Hbf', 'Hamburg Hbf'),
      (201, 1, 'Mannheim Hbf', 'Frankfurt Hbf'),
      (201, 3, 'Mannheim Hbf', 'Karlsruhe Hbf'),
      (202, 1, 'München Hbf', 'Hamburg Hbf'),
      (301, 1, 'Mannheim Hbf', 'Karlsruhe Hbf'),
      (302, 5, 'Hamburg Hbf', 'Westerland');

    INSERT INTO Teilstrecke VALUES
      (101, 1, 'Mannheim Hbf', 'Frankfurt Hbf', '08:00', '08:38', 29.90, 81),
      (101, 2, 'Mannheim Hbf', 'Karlsruhe Hbf', '09:00', '09:24', 19.50, 62),
      (201, 1, 'Mannheim Hbf', 'Darmstadt Hbf', '10:00', '10:35', 14.00, 52),
      (201, 1, 'Darmstadt Hbf', 'Frankfurt Hbf', '10:38', '10:55', 9.50, 29),
      (201, 3, 'Mannheim Hbf', 'Karlsruhe Hbf', '11:00', '11:32', 14.50, 62),
      (301, 1, 'Mannheim Hbf', 'Karlsruhe Hbf', '12:00', '12:52', 11.20, 62),
      (102, 1, 'München Hbf', 'Nürnberg Hbf', '07:00', '08:05', 39.00, 171),
      (102, 1, 'Nürnberg Hbf', 'Kassel-Wilhelmshöhe', '08:10', '10:15', 62.00, 298),
      (102, 1, 'Kassel-Wilhelmshöhe', 'Hannover Hbf', '10:20', '11:12', 34.00, 165),
      (102, 1, 'Hannover Hbf', 'Hamburg Hbf', '11:18', '12:34', 41.00, 181),
      (202, 1, 'München Hbf', 'Frankfurt Hbf', '08:30', '11:55', 58.00, 392),
      (202, 1, 'Frankfurt Hbf', 'Hannover Hbf', '12:05', '14:40', 49.00, 349),
      (202, 1, 'Hannover Hbf', 'Hamburg Hbf', '14:45', '16:10', 31.00, 181),
      (302, 5, 'Hamburg Hbf', 'Niebüll', '13:00', '15:15', 24.00, 185),
      (302, 5, 'Niebüll', 'Westerland', '15:20', '16:00', 12.50, 39);
  `,
};

export const bahnExercises: Exercise[] = [
  {
    id: 'bahn-1-direkt-ma-ka',
    schemaId: 'bahn',
    title: 'Direktverbindungen Mannheim → Karlsruhe',
    source: 'Übungsblatt 3 · Aufg. 5(a)',
    difficulty: 'Basis',
    topics: ['JOIN', 'WHERE'],
    prompt:
      'Geben Sie ZugNr, Zugtyp und Preis (in dieser Reihenfolge) aller Züge auf der direkten Teilstrecke \'Mannheim Hbf\' → \'Karlsruhe Hbf\' an. Sortieren Sie aufsteigend nach Preis.',
    expectedColumns: ['ZugNr', 'Zugtyp', 'Preis'],
    orderMatters: true,
    solutionSql: `SELECT t.ZugNr, z.Zugtyp, t.Preis
FROM Teilstrecke t
JOIN Zug z ON t.ZugNr = z.ZugNr
WHERE t.vonBhf = 'Mannheim Hbf'
  AND t.nachBhf = 'Karlsruhe Hbf'
ORDER BY t.Preis ASC;`,
    hints: [
      'Verknüpfen Sie Teilstrecke und Zug über ZugNr.',
      'Filtern Sie auf vonBhf = \'Mannheim Hbf\' und nachBhf = \'Karlsruhe Hbf\'.',
    ],
    solutionExplanation:
      'Entspricht Π_{ZugNr, Zugtyp, Preis}(σ_{vonBhf=\'Mannheim Hbf\' ∧ nachBhf=\'Karlsruhe Hbf\'}(Teilstrecke ⋈ Zug)) aus Blatt 3.',
  },
  {
    id: 'bahn-2-zugtypen-ma-ffm',
    schemaId: 'bahn',
    title: 'Zugtypen auf der Verbindung Mannheim → Frankfurt',
    source: 'Übungsblatt 5 · Aufg. 3',
    difficulty: 'Basis',
    topics: ['DISTINCT', 'IN / EXISTS / JOIN'],
    prompt:
      'Geben Sie alle Zugtypen (ohne Duplikate) aus, die laut Tabelle Verbindung von \'Mannheim Hbf\' nach \'Frankfurt Hbf\' verkehren.',
    expectedColumns: ['Zugtyp'],
    orderMatters: false,
    requiresDistinct: true,
    solutionSql: `SELECT DISTINCT z.Zugtyp
FROM Zug z
JOIN Verbindung v ON z.ZugNr = v.ZugNr
WHERE v.StartBhf = 'Mannheim Hbf'
  AND v.ZielBhf = 'Frankfurt Hbf';`,
    alternativeSolutions: [
      `SELECT DISTINCT Zugtyp FROM Zug WHERE ZugNr IN (SELECT ZugNr FROM Verbindung WHERE StartBhf = 'Mannheim Hbf' AND ZielBhf = 'Frankfurt Hbf');`,
    ],
    hints: [
      'Prüfen Sie in der Tabelle Verbindung auf StartBhf = \'Mannheim Hbf\' und ZielBhf = \'Frankfurt Hbf\'.',
      'Denken Sie an DISTINCT (und falls Sie EXISTS nutzen, vergessen Sie nicht die Korrelation Z.ZugNr = V.ZugNr!).',
    ],
    solutionExplanation:
      'In Blatt 5 Aufg. 3 waren genau solche Varianten (IN, JOIN, korreliertes EXISTS) äquivalent, während das unkorrelierte EXISTS + INTERSECT fehlerhaft war.',
  },
  {
    id: 'bahn-3-laengste-teilstrecke',
    schemaId: 'bahn',
    title: 'Entfernung der längsten Teilstrecke',
    source: 'Übungsblatt 3 · Aufg. 5(c)',
    difficulty: 'Basis',
    topics: ['MAX', 'Aggregation'],
    prompt: 'Geben Sie die Entfernung der längsten Teilstrecke an.',
    expectedColumns: ['MaxEntfernung'],
    orderMatters: false,
    solutionSql: `SELECT MAX(Entfernung) AS MaxEntfernung
FROM Teilstrecke;`,
    alternativeSolutions: [
      `SELECT DISTINCT Entfernung FROM Teilstrecke WHERE Entfernung >= ALL (SELECT Entfernung FROM Teilstrecke);`,
    ],
    hints: ['Nutzen Sie einfach MAX(Entfernung) auf der Tabelle Teilstrecke.'],
    solutionExplanation: 'Die längste Teilstrecke im Datensatz ist München Hbf → Frankfurt Hbf mit 392 km.',
  },
  {
    id: 'bahn-4-alle-zugtypen-division',
    schemaId: 'bahn',
    title: 'Teilstrecken mit allen Zugtypen (Relationale Division)',
    source: 'Übungsblatt 3 · Aufg. 5(b)',
    difficulty: 'Klausurniveau',
    topics: ['Division', 'Allquantor', 'COUNT(DISTINCT)', 'Doppeltes NOT EXISTS'],
    prompt:
      'Geben Sie die Start- und Zielbahnhöfe (vonBhf, nachBhf, ohne Duplikate) aller Teilstrecken an, auf denen alle in der Datenbank vorhandenen Zugtypen eingesetzt werden.',
    expectedColumns: ['vonBhf', 'nachBhf'],
    orderMatters: false,
    requiresDistinct: true,
    solutionSql: `SELECT t.vonBhf, t.nachBhf
FROM Teilstrecke t
JOIN Zug z ON t.ZugNr = z.ZugNr
GROUP BY t.vonBhf, t.nachBhf
HAVING COUNT(DISTINCT z.Zugtyp) = (SELECT COUNT(DISTINCT Zugtyp) FROM Zug);`,
    alternativeSolutions: [
      `SELECT DISTINCT t1.vonBhf, t1.nachBhf
FROM Teilstrecke t1
WHERE NOT EXISTS (
  SELECT * FROM Zug z1
  WHERE NOT EXISTS (
    SELECT * FROM Teilstrecke t2 JOIN Zug z2 ON t2.ZugNr = z2.ZugNr
    WHERE t2.vonBhf = t1.vonBhf AND t2.nachBhf = t1.nachBhf AND z2.Zugtyp = z1.Zugtyp
  )
);`,
    ],
    hints: [
      'In der Relationalen Algebra entspricht das Π_{vonBhf,nachBhf,Zugtyp}(Teilstrecke ⋈ Zug) ÷ Π_{Zugtyp}(Zug).',
      'In SQL: Gruppieren Sie nach (vonBhf, nachBhf) und prüfen Sie HAVING COUNT(DISTINCT z.Zugtyp) = (SELECT COUNT(DISTINCT Zugtyp) FROM Zug) — oder nutzen Sie doppeltes NOT EXISTS.',
    ],
    solutionExplanation:
      'Es existieren 3 Zugtypen (ICE, IC, RE). Nur auf der Teilstrecke Mannheim Hbf → Karlsruhe Hbf verkehren alle drei Zugtypen.',
  },
  {
    id: 'bahn-5-gesamtpreis-muc-hh',
    schemaId: 'bahn',
    title: 'Gesamtfahrpreis München → Hamburg (GROUP BY + SUM)',
    source: 'Übungsblatt 3 · Aufg. 5(e)',
    difficulty: 'Mittel',
    topics: ['JOIN', 'GROUP BY', 'SUM'],
    prompt:
      'Geben Sie für jede Verbindung, die in \'München Hbf\' startet und in \'Hamburg Hbf\' endet, die ZugNr, den Wochentag und den Gesamtfahrpreis (SUM(Preis) aller zugehörigen Teilstrecken) aus. Sortieren Sie aufsteigend nach Gesamtfahrpreis.',
    expectedColumns: ['ZugNr', 'Wochentag', 'Gesamtpreis'],
    orderMatters: true,
    solutionSql: `SELECT v.ZugNr, v.Wochentag, SUM(t.Preis) AS Gesamtpreis
FROM Verbindung v
JOIN Teilstrecke t ON v.ZugNr = t.ZugNr AND v.Wochentag = t.Wochentag
WHERE v.StartBhf = 'München Hbf'
  AND v.ZielBhf = 'Hamburg Hbf'
GROUP BY v.ZugNr, v.Wochentag
ORDER BY Gesamtpreis ASC;`,
    hints: [
      'Verbinden Sie Verbindung und Teilstrecke über den zusammengesetzten Schlüssel (ZugNr, Wochentag).',
      'Gruppieren Sie nach (v.ZugNr, v.Wochentag) und summieren Sie t.Preis.',
    ],
    solutionExplanation:
      'Während die reine Relationale Algebra aus Blatt 3 Aufg. 5(e) ohne Gruppierung nicht summieren konnte, löst SQL dies direkt mit GROUP BY und SUM(t.Preis).',
  },
  {
    id: 'bahn-6-preis-pro-km',
    schemaId: 'bahn',
    title: 'Durchschnittlicher Preis pro Kilometer je Zugtyp',
    source: 'Klausurtraining (Integer-Division-Falle)',
    difficulty: 'Mittel',
    topics: ['GROUP BY', 'SUM', 'Dezimaldivision'],
    prompt:
      'Berechnen Sie für jeden Zugtyp den durchschnittlichen Preis pro Kilometer über alle Teilstrecken: SUM(Preis) / SUM(Entfernung), gerundet auf 3 Nachkommastellen (ROUND(..., 3)). Geben Sie Zugtyp und PreisProKm absteigend sortiert nach PreisProKm aus.',
    expectedColumns: ['Zugtyp', 'PreisProKm'],
    orderMatters: true,
    solutionSql: `SELECT z.Zugtyp, ROUND(SUM(t.Preis) / SUM(t.Entfernung), 3) AS PreisProKm
FROM Zug z
JOIN Teilstrecke t ON z.ZugNr = t.ZugNr
GROUP BY z.Zugtyp
ORDER BY PreisProKm DESC;`,
    hints: [
      'Joinen Sie Zug und Teilstrecke über ZugNr und gruppieren Sie nach z.Zugtyp.',
      'Beachten Sie die Klausurfalle Integer-Division: Hier ist Preis bereits NUMERIC (Dezimalzahl), weshalb SUM(t.Preis) / SUM(t.Entfernung) nicht abgeschnitten wird; bei reinen Integer-Spalten müsste man mit 1.0 multiplizieren oder CAST(... AS NUMERIC) nutzen.',
    ],
    solutionExplanation:
      'ICE ist pro Kilometer am teuersten, gefolgt von RE und IC. Bei reinen INTEGER-Zählern/Nennern in PostgreSQL/HyPer immer casten oder mit 1.0 multiplizieren!',
  },
];
