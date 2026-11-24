import type { Exercise, SchemaDef } from '../../types/sql';

export const betreuungSchema: SchemaDef = {
  id: 'betreuung',
  title: 'Sachbearbeiter & Kunde (Kundenbetreuung)',
  shortTitle: 'Sachbearbeiter',
  sheets: 'Übungsblatt 9 (Aufg. 2)',
  summary:
    'Das Kundenbetreuungs-Schema aus Übungsblatt 9 mit Sachbearbeitern, Kunden und einer N:M-Betreuungsbeziehung.',
  explanationBullets: [
    'Sachbearbeiter speichert Mitarbeiter mit eindeutiger PersNr, Name und Fachgebiet.',
    'Kunde speichert Kunden mit eindeutiger Kundennummer, Name und Adresse.',
    'Die N:M-Relation betreut(PersNr, Kundennummer) hält fest, welche Sachbearbeiter welche Kunden betreuen.',
  ],
  examNotes: [
    'Auf Übungsblatt 9 wird dieses Schema für die SQL-Anfrage und die anschließende Übersetzung/Optimierung in einen kanonischen Operatorbaum verwendet.',
    'Beachten Sie, dass mehrere Kunden denselben Nachnamen (z. B. \'Schmidt\') tragen können — ohne DISTINCT taucht ein Sachbearbeiter bei mehreren Schmidt-Kunden mehrfach auf!',
  ],
  tables: [
    {
      name: 'Sachbearbeiter',
      description: 'Betreuende Sachbearbeiter nach Fachgebiet',
      columns: [
        { name: 'PersNr', type: 'INTEGER', isPk: true },
        { name: 'Name', type: 'VARCHAR(50)' },
        { name: 'Fachgebiet', type: 'VARCHAR(50)' },
      ],
    },
    {
      name: 'Kunde',
      description: 'Kunden mit Name und Adresse',
      columns: [
        { name: 'Kundennummer', type: 'INTEGER', isPk: true },
        { name: 'Name', type: 'VARCHAR(50)' },
        { name: 'Adresse', type: 'VARCHAR(100)' },
      ],
    },
    {
      name: 'betreut',
      description: 'N:M-Zuordnung zwischen Sachbearbeiter und Kunde',
      columns: [
        { name: 'PersNr', type: 'INTEGER', isPk: true, fkTarget: 'Sachbearbeiter.PersNr' },
        { name: 'Kundennummer', type: 'INTEGER', isPk: true, fkTarget: 'Kunde.Kundennummer' },
      ],
    },
  ],
  seedSql: `
    CREATE TABLE Sachbearbeiter (
      PersNr INTEGER PRIMARY KEY,
      Name VARCHAR(50) NOT NULL,
      Fachgebiet VARCHAR(50) NOT NULL
    );

    CREATE TABLE Kunde (
      Kundennummer INTEGER PRIMARY KEY,
      Name VARCHAR(50) NOT NULL,
      Adresse VARCHAR(100) NOT NULL
    );

    CREATE TABLE betreut (
      PersNr INTEGER NOT NULL REFERENCES Sachbearbeiter(PersNr),
      Kundennummer INTEGER NOT NULL REFERENCES Kunde(Kundennummer),
      PRIMARY KEY (PersNr, Kundennummer)
    );

    INSERT INTO Sachbearbeiter VALUES
      (1, 'Meier', 'Steuerrecht'),
      (2, 'Wagner', 'Firmenkunden'),
      (3, 'Becker', 'Privatkunden'),
      (4, 'Krause', 'Steuerrecht'),
      (5, 'Lehmann', 'Firmenkunden');

    INSERT INTO Kunde VALUES
      (100, 'Schmidt', 'Mannheim, Q7 12'),
      (101, 'Schmidt', 'Heidelberg, Hauptstr. 44'),
      (102, 'Müller', 'Mannheim, L1 3'),
      (103, 'Fischer', 'Ludwigshafen, Berliner Platz 5'),
      (104, 'Weber', 'Darmstadt, Luisenplatz 2'),
      (105, 'Schäfer', 'Frankfurt, Zeil 10');

    INSERT INTO betreut VALUES
      (1, 100),
      (1, 101),
      (1, 102),
      (2, 100),
      (2, 103),
      (3, 102),
      (3, 104),
      (4, 103);
  `,
};

export const betreuungExercises: Exercise[] = [
  {
    id: 'betr-1-schmidt-betreuer',
    schemaId: 'betreuung',
    title: 'Sachbearbeiter von Kunden namens „Schmidt“',
    source: 'Übungsblatt 9 · Aufg. 2',
    difficulty: 'Basis',
    topics: ['3-Wege-JOIN', 'DISTINCT'],
    prompt:
      'Geben Sie die Namen (ohne Duplikate) aller Sachbearbeiter aus, die mindestens einen Kunden mit dem Namen \'Schmidt\' betreuen.',
    expectedColumns: ['Name'],
    orderMatters: false,
    requiresDistinct: true,
    solutionSql: `SELECT DISTINCT s.Name
FROM Sachbearbeiter s, Kunde k, betreut b
WHERE s.PersNr = b.PersNr
  AND b.Kundennummer = k.Kundennummer
  AND k.Name = 'Schmidt';`,
    hints: [
      'Verbinden Sie Sachbearbeiter, betreut und Kunde über PersNr und Kundennummer.',
      'Da Meier beide Kunden namens \'Schmidt\' (100 und 101) betreut, ist SELECT DISTINCT entscheidend!',
    ],
    solutionExplanation:
      'Exakte SQL-Anfrage aus Blatt 9 Aufg. 2: Ohne DISTINCT würde Meier zweimal erscheinen.',
  },
  {
    id: 'betr-2-unbetreute-kunden',
    schemaId: 'betreuung',
    title: 'Kunden ohne Sachbearbeiter',
    source: 'Übung zu Blatt 9 · Aufg. 2',
    difficulty: 'Basis',
    topics: ['NOT EXISTS', 'Anti-Join'],
    prompt:
      'Welche Kunden werden derzeit von keinem Sachbearbeiter betreut? Geben Sie Kundennummer und Name (in dieser Reihenfolge) aus.',
    expectedColumns: ['Kundennummer', 'Name'],
    orderMatters: false,
    solutionSql: `SELECT k.Kundennummer, k.Name
FROM Kunde k
WHERE NOT EXISTS (
  SELECT *
  FROM betreut b
  WHERE b.Kundennummer = k.Kundennummer
);`,
    hints: ['Prüfen Sie per NOT EXISTS (oder LEFT JOIN ... IS NULL), welche Kundennummer nicht in betreut auftritt.'],
    solutionExplanation: 'Kunde 105 (Schäfer) hat keinen Eintrag in der Tabelle betreut.',
  },
  {
    id: 'betr-3-kundenanzahl-pro-sb',
    schemaId: 'betreuung',
    title: 'Betreute Kunden pro Sachbearbeiter (inkl. 0)',
    source: 'Klausurtraining (LEFT JOIN + COUNT)',
    difficulty: 'Mittel',
    topics: ['LEFT JOIN', 'GROUP BY', 'COUNT(Spalte)'],
    prompt:
      'Geben Sie für jeden Sachbearbeiter dessen Name und die Anzahl der von ihm betreuten Kunden aus — auch für Sachbearbeiter ohne Kunden (0). Sortieren Sie absteigend nach der Anzahl und bei Gleichstand alphabetisch aufsteigend nach Name.',
    expectedColumns: ['Name', 'Anzahl'],
    orderMatters: true,
    solutionSql: `SELECT s.Name, COUNT(b.Kundennummer) AS Anzahl
FROM Sachbearbeiter s
LEFT JOIN betreut b ON s.PersNr = b.PersNr
GROUP BY s.PersNr, s.Name
ORDER BY Anzahl DESC, s.Name ASC;`,
    hints: [
      'Verwenden Sie LEFT JOIN, damit Lehmann (ohne Kunden) nicht verloren geht.',
      'Verwenden Sie COUNT(b.Kundennummer) statt COUNT(*), damit bei 0 Kunden auch wirklich 0 gezählt wird!',
    ],
    solutionExplanation:
      'COUNT(b.Kundennummer) ignoriert den NULL-Wert aus dem LEFT JOIN bei Lehmann und liefert korrekt 0.',
  },
  {
    id: 'betr-4-fachgebiete-kunden',
    schemaId: 'betreuung',
    title: 'Fachgebiete mit mindestens 3 verschiedenen Kunden',
    source: 'Klausurtraining (COUNT DISTINCT + HAVING)',
    difficulty: 'Mittel',
    topics: ['GROUP BY', 'HAVING', 'COUNT(DISTINCT)'],
    prompt:
      'Geben Sie alle Fachgebiete (Spalte Fachgebiet) und die Anzahl verschiedener Kunden (COUNT(DISTINCT ...)) aus, in denen mindestens 3 verschiedene Kunden betreut werden.',
    expectedColumns: ['Fachgebiet', 'KundenAnzahl'],
    orderMatters: false,
    solutionSql: `SELECT s.Fachgebiet, COUNT(DISTINCT b.Kundennummer) AS KundenAnzahl
FROM Sachbearbeiter s
JOIN betreut b ON s.PersNr = b.PersNr
GROUP BY s.Fachgebiet
HAVING COUNT(DISTINCT b.Kundennummer) >= 3;`,
    hints: [
      'Gruppieren Sie nach s.Fachgebiet und zählen Sie mit COUNT(DISTINCT b.Kundennummer).',
      'Filtern Sie anschließend mit HAVING COUNT(DISTINCT b.Kundennummer) >= 3.',
    ],
    solutionExplanation:
      'Im Fachgebiet Steuerrecht betreuen Meier (100, 101, 102) und Krause (103) zusammen 4 verschiedene Kunden.',
  },
  {
    id: 'betr-5-alle-schmidts',
    schemaId: 'betreuung',
    title: 'Sachbearbeiter, die ALLE „Schmidt“-Kunden betreuen',
    source: 'Klausurtraining (Allquantor / Division)',
    difficulty: 'Klausurniveau',
    topics: ['Allquantor', 'Doppeltes NOT EXISTS'],
    prompt:
      'Geben Sie die Namen aller Sachbearbeiter aus, die jeden einzelnen Kunden mit dem Namen \'Schmidt\' betreuen.',
    expectedColumns: ['Name'],
    orderMatters: false,
    requiresDistinct: true,
    solutionSql: `SELECT s.Name
FROM Sachbearbeiter s
WHERE NOT EXISTS (
  SELECT *
  FROM Kunde k
  WHERE k.Name = 'Schmidt'
    AND NOT EXISTS (
      SELECT *
      FROM betreut b
      WHERE b.PersNr = s.PersNr
        AND b.Kundennummer = k.Kundennummer
    )
);`,
    hints: [
      'Formen Sie den Allquantor in ein doppeltes NOT EXISTS um: „Es gibt keinen Kunden Schmidt, den der Sachbearbeiter s nicht betreut.“',
      'Alternativ: Filtern Sie auf k.Name = \'Schmidt\' und prüfen Sie HAVING COUNT(DISTINCT k.Kundennummer) = (SELECT COUNT(*) FROM Kunde WHERE Name = \'Schmidt\').',
    ],
    solutionExplanation:
      'Wagner betreut nur einen Schmidt (100), während Meier beide Kunden mit dem Namen Schmidt (100 und 101) betreut.',
  },
  {
    id: 'betr-6-mannheim-kunden',
    schemaId: 'betreuung',
    title: 'Kunden mit Adresse in Mannheim (LIKE)',
    source: 'Übung zu Blatt 9 · Aufg. 2',
    difficulty: 'Basis',
    topics: ['LIKE', 'WHERE'],
    prompt:
      'Finden Sie alle Kunden, in deren `Adresse` das Wort `\'Mannheim\'` vorkommt. Geben Sie `Kundennummer`, `Name` und `Adresse` aufsteigend nach `Kundennummer` aus.',
    expectedColumns: ['Kundennummer', 'Name', 'Adresse'],
    orderMatters: true,
    solutionSql: `SELECT Kundennummer, Name, Adresse
FROM Kunde
WHERE Adresse LIKE '%Mannheim%'
ORDER BY Kundennummer ASC;`,
    hints: ['Nutzen Sie `WHERE Adresse LIKE \'%Mannheim%\'`.'],
    solutionExplanation: 'Kunde 100 (Schmidt) und 102 (Müller) haben eine Mannheimer Adresse.',
  },
  {
    id: 'betr-7-mehrfach-betreute-kunden',
    schemaId: 'betreuung',
    title: 'Kunden mit mehreren Sachbearbeitern',
    source: 'Klausurtraining (GROUP BY + HAVING)',
    difficulty: 'Basis',
    topics: ['JOIN', 'GROUP BY', 'HAVING'],
    prompt:
      'Welche Kunden werden von mehr als einem Sachbearbeiter betreut? Geben Sie `Kundennummer` und `Name` aufsteigend nach `Kundennummer` sortiert aus.',
    expectedColumns: ['Kundennummer', 'Name'],
    orderMatters: true,
    solutionSql: `SELECT k.Kundennummer, k.Name
FROM Kunde k
JOIN betreut b ON k.Kundennummer = b.Kundennummer
GROUP BY k.Kundennummer, k.Name
HAVING COUNT(*) > 1
ORDER BY k.Kundennummer ASC;`,
    hints: ['Gruppieren Sie nach `(k.Kundennummer, k.Name)` und filtern Sie mit `HAVING COUNT(*) > 1`.'],
    solutionExplanation: 'Schmidt (100), Müller (102) und Fischer (103) haben je 2 Sachbearbeiter.',
  },
  {
    id: 'betr-8-sb-ohne-kunden',
    schemaId: 'betreuung',
    title: 'Sachbearbeiter ohne zugewiesene Kunden',
    source: 'Klausurtraining (Anti-Join)',
    difficulty: 'Basis',
    topics: ['NOT EXISTS', 'Anti-Join'],
    prompt:
      'Welche Sachbearbeiter betreuen derzeit keinen einzigen Kunden? Geben Sie `PersNr` und `Name` aus.',
    expectedColumns: ['PersNr', 'Name'],
    orderMatters: false,
    solutionSql: `SELECT s.PersNr, s.Name
FROM Sachbearbeiter s
WHERE NOT EXISTS (
  SELECT *
  FROM betreut b
  WHERE b.PersNr = s.PersNr
);`,
    hints: ['Prüfen Sie mit `WHERE NOT EXISTS` gegen `betreut`.'],
    solutionExplanation: 'Nur Lehmann (PersNr 5) hat keinen Eintrag in `betreut`.',
  },
  {
    id: 'betr-9-meiste-kunden-sb',
    schemaId: 'betreuung',
    title: 'Sachbearbeiter mit den meisten Kunden (CTE + MAX)',
    source: 'Klausurtraining (WITH / CTE + MAX)',
    difficulty: 'Mittel',
    topics: ['WITH / CTE', 'GROUP BY', 'MAX'],
    prompt:
      'Bestimmen Sie `Name` und Anzahl betreuter Kunden des Sachbearbeiters (bzw. der Sachbearbeiter bei Gleichstand) mit den meisten betreuten Kunden.',
    expectedColumns: ['Name', 'Anzahl'],
    orderMatters: false,
    solutionSql: `WITH Zaehlung AS (
  SELECT s.PersNr, s.Name, COUNT(*) AS Anzahl
  FROM Sachbearbeiter s
  JOIN betreut b ON s.PersNr = b.PersNr
  GROUP BY s.PersNr, s.Name
)
SELECT Name, Anzahl
FROM Zaehlung
WHERE Anzahl = (SELECT MAX(Anzahl) FROM Zaehlung);`,
    hints: ['Berechnen Sie die Kundenanzahl je Sachbearbeiter in einer `WITH`-CTE und wählen Sie das Maximum.'],
    solutionExplanation: 'Meier betreut 3 Kunden (100, 101, 102) und liegt damit alleine an der Spitze.',
  },
  {
    id: 'betr-10-steuerrecht-kunden',
    schemaId: 'betreuung',
    title: 'Kunden im Fachgebiet Steuerrecht',
    source: 'Klausurtraining (3-Wege-JOIN + DISTINCT)',
    difficulty: 'Basis',
    topics: ['3-Wege-JOIN', 'DISTINCT'],
    prompt:
      'Geben Sie die Namen (ohne Duplikate) aller Kunden aus, die von mindestens einem Sachbearbeiter aus dem Fachgebiet `\'Steuerrecht\'` betreut werden. Sortieren Sie alphabetisch aufsteigend.',
    expectedColumns: ['Name'],
    orderMatters: true,
    requiresDistinct: true,
    solutionSql: `SELECT DISTINCT k.Name
FROM Sachbearbeiter s
JOIN betreut b ON s.PersNr = b.PersNr
JOIN Kunde k ON b.Kundennummer = k.Kundennummer
WHERE s.Fachgebiet = 'Steuerrecht'
ORDER BY k.Name ASC;`,
    hints: ['Verbinden Sie `Sachbearbeiter` → `betreut` → `Kunde`, filtern Sie auf `s.Fachgebiet = \'Steuerrecht\'` und denken Sie an `DISTINCT` (es gibt zwei Kunden namens Schmidt!).'],
    solutionExplanation: 'Ohne `DISTINCT` würde Schmidt zweimal erscheinen — das eindeutige Ergebnis lautet Fischer, Müller, Schmidt.',
  },
  {
    id: 'betr-11-kunden-zwei-fachgebiete',
    schemaId: 'betreuung',
    title: 'Kunden in mindestens 2 verschiedenen Fachgebieten',
    source: 'Klausurtraining (COUNT DISTINCT + HAVING)',
    difficulty: 'Mittel',
    topics: ['3-Wege-JOIN', 'COUNT(DISTINCT)', 'HAVING'],
    prompt:
      'Welche Kunden werden von Sachbearbeitern aus mindestens 2 **verschiedenen** Fachgebieten betreut? Geben Sie `Kundennummer` und `Name` aufsteigend nach `Kundennummer` aus.',
    expectedColumns: ['Kundennummer', 'Name'],
    orderMatters: true,
    solutionSql: `SELECT k.Kundennummer, k.Name
FROM Kunde k
JOIN betreut b ON k.Kundennummer = b.Kundennummer
JOIN Sachbearbeiter s ON b.PersNr = s.PersNr
GROUP BY k.Kundennummer, k.Name
HAVING COUNT(DISTINCT s.Fachgebiet) >= 2
ORDER BY k.Kundennummer ASC;`,
    hints: ['Gruppieren Sie nach Kunde und prüfen Sie `HAVING COUNT(DISTINCT s.Fachgebiet) >= 2`.'],
    solutionExplanation:
      'Schmidt (100: Steuerrecht & Firmenkunden), Müller (102: Steuerrecht & Privatkunden) und Fischer (103: Firmenkunden & Steuerrecht) werden fachübergreifend betreut.',
  },
  {
    id: 'betr-12-gemeinsame-kunden-paare',
    schemaId: 'betreuung',
    title: 'Sachbearbeiter-Paare mit gemeinsamen Kunden (Self-Join)',
    source: 'Klausurtraining (Self-Join ohne Spiegelduplikate)',
    difficulty: 'Klausurniveau',
    topics: ['Self-Join', 'DISTINCT'],
    prompt:
      'Finden Sie alle Paare verschiedener Sachbearbeiter, die mindestens einen gemeinsamen Kunden betreuen. Geben Sie `Name1` und `Name2` so aus, dass jedes Paar nur **einmal** vorkommt (`s1.PersNr < s2.PersNr`). Sortieren Sie alphabetisch nach `Name1` und `Name2`.',
    expectedColumns: ['Name1', 'Name2'],
    orderMatters: true,
    requiresDistinct: true,
    solutionSql: `SELECT DISTINCT s1.Name AS Name1, s2.Name AS Name2
FROM betreut b1
JOIN betreut b2 ON b1.Kundennummer = b2.Kundennummer AND b1.PersNr < b2.PersNr
JOIN Sachbearbeiter s1 ON b1.PersNr = s1.PersNr
JOIN Sachbearbeiter s2 ON b2.PersNr = s2.PersNr
ORDER BY Name1 ASC, Name2 ASC;`,
    hints: [
      'Joinen Sie `betreut` mit sich selbst über gleiche `Kundennummer` und erzwingen Sie `b1.PersNr < b2.PersNr` gegen Selbst- und Spiegelpaare.',
    ],
    solutionExplanation:
      'Es ergeben sich 3 Paare: (Meier, Becker) über Kunde 102, (Meier, Wagner) über Kunde 100 und (Wagner, Krause) über Kunde 103.',
  },
  {
    id: 'betr-13-fachgebiete-statistik',
    schemaId: 'betreuung',
    title: 'Auslastung je Fachgebiet (Sachbearbeiter & Betreuungen)',
    source: 'Klausurtraining (LEFT JOIN + COUNT DISTINCT)',
    difficulty: 'Klausurniveau',
    topics: ['LEFT JOIN', 'GROUP BY', 'COUNT(DISTINCT)'],
    prompt:
      'Geben Sie für jedes `Fachgebiet` die Anzahl seiner Sachbearbeiter (`COUNT(DISTINCT s.PersNr)`) sowie die Gesamtanzahl aller Betreuungszuordnungen (`COUNT(b.Kundennummer)`) aus. Sortieren Sie absteigend nach Betreuungszuordnungen und alphabetisch nach `Fachgebiet`.',
    expectedColumns: ['Fachgebiet', 'AnzahlSB', 'AnzahlBetreuungen'],
    orderMatters: true,
    solutionSql: `SELECT s.Fachgebiet,
       COUNT(DISTINCT s.PersNr) AS AnzahlSB,
       COUNT(b.Kundennummer) AS AnzahlBetreuungen
FROM Sachbearbeiter s
LEFT JOIN betreut b ON s.PersNr = b.PersNr
GROUP BY s.Fachgebiet
ORDER BY AnzahlBetreuungen DESC, s.Fachgebiet ASC;`,
    hints: [
      'Durch den `LEFT JOIN` zu `betreut` taucht ein Sachbearbeiter mit mehreren Kunden mehrfach auf — daher muss `COUNT(DISTINCT s.PersNr)` für die Anzahl Sachbearbeiter verwendet werden!',
    ],
    solutionExplanation:
      'Steuerrecht: 2 SB, 4 Betreuungen; Firmenkunden: 2 SB (inkl. Lehmann!), 2 Betreuungen; Privatkunden: 1 SB, 2 Betreuungen.',
  },
];
