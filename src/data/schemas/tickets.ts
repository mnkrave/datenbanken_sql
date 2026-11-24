import type { Exercise, SchemaDef } from '../../types/sql';

export const ticketsSchema: SchemaDef = {
  id: 'tickets',
  title: 'Ticketverwaltung einer Vorverkaufsstelle',
  shortTitle: 'Ticketverwaltung',
  sheets: 'Übungsblatt 7 (Aufg. 1)',
  summary:
    'Das SQL-Schema aus Übungsblatt 7 mit Veranstaltungen, Tickets, Kunden und verkauften Tickets — inklusive exakter 22 Tupel und referentieller Integritätsbedingungen (ON UPDATE/DELETE CASCADE).',
  explanationBullets: [
    'Veranstaltung speichert den eindeutigen Veranstaltungsnamen (Veranstaltung), das Datum und den Ort.',
    'Tickets speichert jedes einzelne Ticket (TicketNr) mit Preis und Verweis auf Veranstaltungsname (FK mit ON UPDATE CASCADE).',
    'Kunde speichert KundenNr, Name und Wohnort der Käufer.',
    'Verkauft ordnet verkaufte Tickets (TicketNr, PK & FK → Tickets ohne CASCADE) genau einem Käufer (KundenNr, FK → Kunde mit ON DELETE CASCADE) zu.',
  ],
  examNotes: [
    'Referentielle Integrität (Blatt 7 Aufg. 1): Ein DELETE auf Tickets für ein bereits verkauftes Ticket schlägt fehl (Default Restrict), während ein DELETE auf Kunde automatisch die zugehörigen Zeilen in Verkauft löscht (ON DELETE CASCADE)!',
    'Nicht alle Tickets in Tickets wurden verkauft — achten Sie bei „unverkauften Tickets“ oder „Gesamtumsatz pro Veranstaltung“ auf NOT EXISTS bzw. LEFT JOIN.',
  ],
  tables: [
    {
      name: 'Veranstaltung',
      description: 'Veranstaltungen mit Datum und Austragungsort',
      columns: [
        { name: 'Veranstaltung', type: 'VARCHAR(100)', isPk: true },
        { name: 'Datum', type: 'DATE' },
        { name: 'Ort', type: 'VARCHAR(100)' },
      ],
    },
    {
      name: 'Tickets',
      description: 'Alle verfügbaren und verkauften Einzeltickets',
      columns: [
        { name: 'TicketNr', type: 'INTEGER', isPk: true },
        { name: 'Preis', type: 'DECIMAL(10,2)' },
        { name: 'Veranstaltungsname', type: 'VARCHAR(100)', fkTarget: 'Veranstaltung.Veranstaltung', note: 'ON UPDATE CASCADE' },
      ],
    },
    {
      name: 'Kunde',
      description: 'Registrierte Kunden der Vorverkaufsstelle',
      columns: [
        { name: 'KundenNr', type: 'INTEGER', isPk: true },
        { name: 'Name', type: 'VARCHAR(100)' },
        { name: 'Wohnort', type: 'VARCHAR(100)' },
      ],
    },
    {
      name: 'Verkauft',
      description: 'Zuordnung verkaufter Tickets zu Kunden (1:N)',
      columns: [
        { name: 'TicketNr', type: 'INTEGER', isPk: true, fkTarget: 'Tickets.TicketNr', note: 'Default RESTRICT' },
        { name: 'KundenNr', type: 'INTEGER', fkTarget: 'Kunde.KundenNr', note: 'ON DELETE CASCADE' },
      ],
    },
  ],
  seedSql: `
    CREATE TABLE Veranstaltung (
      Veranstaltung VARCHAR(100) NOT NULL PRIMARY KEY,
      Datum DATE,
      Ort VARCHAR(100)
    );

    CREATE TABLE Tickets (
      TicketNr INTEGER NOT NULL PRIMARY KEY,
      Preis DECIMAL(10,2),
      Veranstaltungsname VARCHAR(100),
      CONSTRAINT vname
        FOREIGN KEY (Veranstaltungsname)
        REFERENCES Veranstaltung(Veranstaltung)
        ON UPDATE CASCADE
    );

    CREATE TABLE Kunde (
      KundenNr INTEGER NOT NULL PRIMARY KEY,
      Name VARCHAR(100),
      Wohnort VARCHAR(100)
    );

    CREATE TABLE Verkauft (
      TicketNr INTEGER NOT NULL PRIMARY KEY,
      KundenNr INTEGER,
      CONSTRAINT ticket
        FOREIGN KEY (TicketNr)
        REFERENCES Tickets(TicketNr),
      CONSTRAINT kunde
        FOREIGN KEY (KundenNr)
        REFERENCES Kunde(KundenNr)
        ON DELETE CASCADE
    );

    INSERT INTO Veranstaltung VALUES
      ('WM:EC-DE', '2006-06-20', 'Berlin'),
      ('WM:SE-GB', '2006-06-15', 'Köln'),
      ('WM:NL-AR', '2006-05-16', 'Frankfurt'),
      ('B.B.King', '2006-09-10', 'Mannheim, SAP Arena');

    INSERT INTO Tickets VALUES
      (2345, 50.00, 'WM:EC-DE'),
      (2346, 50.00, 'WM:EC-DE'),
      (2350, 60.00, 'WM:SE-GB'),
      (2351, 60.00, 'WM:SE-GB'),
      (4712, 120.00, 'WM:NL-AR'),
      (4713, 120.00, 'WM:NL-AR'),
      (4714, 160.00, 'WM:NL-AR'),
      (3257, 69.00, 'B.B.King'),
      (3258, 69.00, 'B.B.King');

    INSERT INTO Kunde VALUES
      (7, 'Rudi Völler', 'Leverkusen'),
      (4711, 'Verona Feldbusch', 'Köln'),
      (815, 'Rudi Carell', 'Alkmaar'),
      (3333, 'Eric Clapton', 'London');

    INSERT INTO Verkauft VALUES
      (2345, 815),
      (2346, 815),
      (2350, 4711),
      (4714, 7),
      (3257, 3333);
  `,
};

export const ticketsExercises: Exercise[] = [
  {
    id: 'tick-1-kunden-tickets',
    schemaId: 'tickets',
    title: 'Kunden und ihre gekauften Tickets',
    source: 'Übung zu Blatt 7 · Aufg. 1',
    difficulty: 'Basis',
    topics: ['3-Wege-JOIN', 'ORDER BY'],
    prompt:
      'Geben Sie für jedes verkaufte Ticket den Namen des Kunden, die TicketNr und den Veranstaltungsname (in dieser Reihenfolge) aus. Sortieren Sie aufsteigend nach TicketNr.',
    expectedColumns: ['Name', 'TicketNr', 'Veranstaltungsname'],
    orderMatters: true,
    solutionSql: `SELECT k.Name, t.TicketNr, t.Veranstaltungsname
FROM Kunde k
JOIN Verkauft v ON k.KundenNr = v.KundenNr
JOIN Tickets t ON v.TicketNr = t.TicketNr
ORDER BY t.TicketNr ASC;`,
    hints: ['Verbinden Sie Kunde → Verkauft → Tickets über KundenNr und TicketNr.'],
    solutionExplanation: 'Es wurden genau 5 Tickets verkauft (2345, 2346, 2350, 3257, 4714).',
  },
  {
    id: 'tick-2-unverkaufte-tickets',
    schemaId: 'tickets',
    title: 'Noch nicht verkaufte Tickets (Anti-Join)',
    source: 'Übung zu Blatt 7 · Aufg. 1',
    difficulty: 'Basis',
    topics: ['NOT EXISTS', 'Anti-Join'],
    prompt:
      'Welche Tickets wurden bisher noch nicht verkauft? Geben Sie TicketNr, Veranstaltungsname und Preis (in dieser Reihenfolge) aufsteigend sortiert nach TicketNr aus.',
    expectedColumns: ['TicketNr', 'Veranstaltungsname', 'Preis'],
    orderMatters: true,
    solutionSql: `SELECT t.TicketNr, t.Veranstaltungsname, t.Preis
FROM Tickets t
WHERE NOT EXISTS (
  SELECT *
  FROM Verkauft v
  WHERE v.TicketNr = t.TicketNr
)
ORDER BY t.TicketNr ASC;`,
    alternativeSolutions: [
      `SELECT TicketNr, Veranstaltungsname, Preis FROM Tickets WHERE TicketNr NOT IN (SELECT TicketNr FROM Verkauft) ORDER BY TicketNr ASC;`,
    ],
    hints: ['Prüfen Sie mit NOT EXISTS, ob die TicketNr nicht in der Tabelle Verkauft vorkommt.'],
    solutionExplanation: 'Vier Tickets sind noch unverkauft: 2351, 3258, 4712 und 4713.',
  },
  {
    id: 'tick-3-mehrfachkaeufer',
    schemaId: 'tickets',
    title: 'Kunden mit mehr als einem Ticket',
    source: 'Klausurtraining (GROUP BY + HAVING)',
    difficulty: 'Mittel',
    topics: ['GROUP BY', 'HAVING', 'COUNT'],
    prompt:
      'Geben Sie den Namen und die Anzahl gekaufter Tickets (in dieser Reihenfolge) aller Kunden aus, die mehr als ein Ticket gekauft haben.',
    expectedColumns: ['Name', 'Anzahl'],
    orderMatters: false,
    solutionSql: `SELECT k.Name, COUNT(*) AS Anzahl
FROM Kunde k
JOIN Verkauft v ON k.KundenNr = v.KundenNr
GROUP BY k.KundenNr, k.Name
HAVING COUNT(*) > 1;`,
    hints: ['Gruppieren Sie nach Kunde (k.KundenNr, k.Name) und filtern Sie mit HAVING COUNT(*) > 1.'],
    solutionExplanation: 'Nur Rudi Carell (KundenNr 815) hat 2 Tickets (2345 und 2346) erworben.',
  },
  {
    id: 'tick-4-umsatz-pro-veranstaltung',
    schemaId: 'tickets',
    title: 'Umsatz & Verkaufsquote pro Veranstaltung',
    source: 'Klausurtraining (Aggregation + Sortierung)',
    difficulty: 'Mittel',
    topics: ['JOIN', 'GROUP BY', 'SUM', 'COUNT'],
    prompt:
      'Berechnen Sie für jede Veranstaltung die Anzahl verkaufter Tickets und den erzielten Umsatz (SUM(Preis) der verkauften Tickets). Geben Sie Veranstaltungsname, VerkauftAnzahl und Umsatz (in dieser Reihenfolge) absteigend sortiert nach Umsatz aus.',
    expectedColumns: ['Veranstaltungsname', 'VerkauftAnzahl', 'Umsatz'],
    orderMatters: true,
    solutionSql: `SELECT t.Veranstaltungsname, COUNT(*) AS VerkauftAnzahl, SUM(t.Preis) AS Umsatz
FROM Tickets t
JOIN Verkauft v ON t.TicketNr = v.TicketNr
GROUP BY t.Veranstaltungsname
ORDER BY Umsatz DESC;`,
    hints: [
      'Joinen Sie Tickets mit Verkauft (so zählen nur verkaufte Tickets) und gruppieren Sie nach t.Veranstaltungsname.',
      'Summieren Sie t.Preis und sortieren Sie absteigend nach dem Umsatz.',
    ],
    solutionExplanation:
      'WM:NL-AR erzielt mit nur einem teuren Ticket (160 €) den höchsten Umsatz, gefolgt von WM:EC-DE (2 × 50 € = 100 €).',
  },
  {
    id: 'tick-5-heimspiel-kunden',
    schemaId: 'tickets',
    title: 'Kunden mit Ticket in ihrem eigenen Wohnort',
    source: 'Klausurtraining (4-Wege-JOIN)',
    difficulty: 'Mittel',
    topics: ['4-Wege-JOIN', 'WHERE'],
    prompt:
      'Geben Sie die Namen (ohne Duplikate) aller Kunden aus, die ein Ticket für eine Veranstaltung gekauft haben, deren Ort genau ihrem eigenen Wohnort entspricht.',
    expectedColumns: ['Name'],
    orderMatters: false,
    requiresDistinct: true,
    solutionSql: `SELECT DISTINCT k.Name
FROM Kunde k
JOIN Verkauft vk ON k.KundenNr = vk.KundenNr
JOIN Tickets t ON vk.TicketNr = t.TicketNr
JOIN Veranstaltung va ON t.Veranstaltungsname = va.Veranstaltung
WHERE k.Wohnort = va.Ort;`,
    hints: [
      'Verbinden Sie alle vier Tabellen: Kunde → Verkauft → Tickets → Veranstaltung.',
      'Vergleichen Sie k.Wohnort = va.Ort.',
    ],
    solutionExplanation:
      'Verona Feldbusch wohnt in Köln und besitzt Ticket 2350 für WM:SE-GB in Köln.',
  },
  {
    id: 'tick-6-ausverkaufte-veranstaltungen',
    schemaId: 'tickets',
    title: 'Vollständig ausverkaufte Veranstaltungen (Allquantor)',
    source: 'Klausurtraining (Allquantor / NOT EXISTS)',
    difficulty: 'Klausurniveau',
    topics: ['Allquantor', 'Doppeltes NOT EXISTS'],
    prompt:
      'Welche Veranstaltungen sind vollständig ausverkauft, d. h. jedes Ticket dieser Veranstaltung steht in der Tabelle Verkauft (und die Veranstaltung hat mindestens ein Ticket)? Geben Sie den Namen der Veranstaltung aus.',
    expectedColumns: ['Veranstaltung'],
    orderMatters: false,
    requiresDistinct: true,
    solutionSql: `SELECT va.Veranstaltung
FROM Veranstaltung va
WHERE EXISTS (
  SELECT * FROM Tickets t WHERE t.Veranstaltungsname = va.Veranstaltung
)
AND NOT EXISTS (
  SELECT *
  FROM Tickets t
  WHERE t.Veranstaltungsname = va.Veranstaltung
    AND NOT EXISTS (
      SELECT *
      FROM Verkauft vk
      WHERE vk.TicketNr = t.TicketNr
    )
);`,
    hints: [
      '„Alle Tickets einer Veranstaltung sind verkauft“ ⇔ „Es gibt kein Ticket dieser Veranstaltung, das nicht in Verkauft steht“.',
      'Prüfen Sie zusätzlich mit EXISTS, dass überhaupt Tickets für die Veranstaltung existieren.',
    ],
    solutionExplanation:
      'Nur für WM:EC-DE wurden alle vorhandenen Tickets (2345 und 2346) verkauft — bei allen anderen Veranstaltungen existiert mindestens ein unverkauftes Ticket.',
  },
];
