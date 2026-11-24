import type { Exercise, SchemaDef } from '../../types/sql';

export const employeeSchema: SchemaDef = {
  id: 'employee',
  title: 'Mitarbeiterhierarchie (employee)',
  shortTitle: 'Hierarchie',
  sheets: 'Übungsblatt 6 (Aufg. 4b)',
  summary:
    'Das Hierarchie-Schema aus Übungsblatt 6 mit 14 Mitarbeitern und selbstreferenzierender manager_id — das zentrale Schema zum Üben rekursiver SQL-Anfragen (WITH RECURSIVE).',
  explanationBullets: [
    'Jeder Mitarbeiter hat eine eindeutige employee_id, seinen direkten Vorgesetzten manager_id, einen name und sein salary.',
    'Die Spalte manager_id ist ein NOT NULL-Fremdschlüssel auf employee(employee_id).',
    'Wichtige Besonderheit der Instanz: Die oberste Chefin (1, \'Ainslie\') verweist mit manager_id = 1 auf sich selbst!',
    'Hierarchiebaum: Ainslie (1) ← {Briana (2), Calista (3), Delmar (4)}; Calista ← {Fabriane (6), Genevieve (7)}; Fabriane ← {Inari (9), Jordan (10)}; Jordan ← {Marlon (13), Nissa (14)}.',
  ],
  examNotes: [
    'Zyklus-Falle (Klausurfalle aus Kap. 4 S. 82–83!): Da Ainslie manager_id = employee_id (= 1) hat, läuft WITH RECURSIVE ... UNION ALL ohne Abbruchbedingung (manager_id <> employee_id) in eine Endlosschleife!',
    'Mit UNION statt UNION ALL oder expliziter Bedingung manager_id <> employee_id terminiert die Rekursion sauber.',
  ],
  tables: [
    {
      name: 'employee',
      description: 'Mitarbeiterhierarchie (exakte 14 Tupel aus Blatt 6)',
      columns: [
        { name: 'employee_id', type: 'INTEGER', isPk: true },
        { name: 'manager_id', type: 'INTEGER', fkTarget: 'employee.employee_id', note: 'Wurzel: manager_id = employee_id (1)' },
        { name: 'name', type: 'VARCHAR(20)' },
        { name: 'salary', type: 'NUMERIC(20,2)' },
      ],
    },
  ],
  seedSql: `
    CREATE TABLE employee (
      employee_id INTEGER NOT NULL PRIMARY KEY,
      manager_id INTEGER NOT NULL REFERENCES employee(employee_id),
      name VARCHAR(20) NOT NULL,
      salary NUMERIC(20,2) NOT NULL
    );

    INSERT INTO employee VALUES
      (1,  1,  'Ainslie',   1000000.00),
      (2,  1,  'Briana',     900000.00),
      (3,  1,  'Calista',    900000.00),
      (4,  1,  'Delmar',     900000.00),
      (5,  2,  'Electra',    750000.00),
      (6,  3,  'Fabriane',   800000.00),
      (7,  3,  'Genevieve',  750000.00),
      (8,  4,  'Hunter',     800000.00),
      (9,  6,  'Inari',      500000.00),
      (10, 6,  'Jordan',     100000.00),
      (11, 8,  'Khalil',     100000.00),
      (12, 8,  'Lisette',    100000.00),
      (13, 10, 'Marlon',     100000.00),
      (14, 10, 'Nissa',      100000.00);
  `,
};

export const employeeExercises: Exercise[] = [
  {
    id: 'emp-1-direkte-untergebene',
    schemaId: 'employee',
    title: 'Direkte Untergebene von Calista',
    source: 'Einstieg (nach Blatt 6 Aufg. 4b)',
    difficulty: 'Basis',
    topics: ['Self-Join', 'WHERE'],
    prompt:
      'Geben Sie die Namen aller Mitarbeiter aus, deren direkter Vorgesetzter \'Calista\' ist. Sortieren Sie alphabetisch aufsteigend.',
    expectedColumns: ['name'],
    orderMatters: true,
    solutionSql: `SELECT e.name
FROM employee e
JOIN employee m ON e.manager_id = m.employee_id
WHERE m.name = 'Calista'
  AND e.employee_id <> m.employee_id
ORDER BY e.name ASC;`,
    hints: [
      'Verbinden Sie employee mit sich selbst über e.manager_id = m.employee_id.',
      'Filtern Sie auf m.name = \'Calista\'.',
    ],
    solutionExplanation: 'Calista (ID 3) ist direkte Vorgesetzte von Fabriane (6) und Genevieve (7).',
  },
  {
    id: 'emp-2-vorgesetzte-marlon',
    schemaId: 'employee',
    title: 'Alle Vorgesetzten von Marlon (Rekursives SQL)',
    source: 'Übungsblatt 6 · Aufg. 4(b)',
    difficulty: 'Klausurniveau',
    topics: ['WITH RECURSIVE', 'Zyklenschutz', 'Bottom-Up-Rekursion'],
    prompt:
      'Schreiben Sie eine rekursive SQL-Anfrage, die alle direkten und indirekten Vorgesetzten (nur Spalte name, ohne Marlon selbst!) des Mitarbeiters \'Marlon\' ausgibt. Sortieren Sie nach Hierarchieebene von oben nach unten (oberster Chef Ainslie zuerst, direkter Chef Jordan zuletzt).',
    expectedColumns: ['name'],
    orderMatters: true,
    solutionSql: `WITH RECURSIVE Vorgesetzte(level, employee_id, manager_id, name) AS (
  SELECT 1, m.employee_id, m.manager_id, m.name
  FROM employee e
  JOIN employee m ON e.manager_id = m.employee_id
  WHERE e.name = 'Marlon'
    AND e.employee_id <> e.manager_id
  UNION ALL
  SELECT v.level + 1, m.employee_id, m.manager_id, m.name
  FROM Vorgesetzte v
  JOIN employee m ON v.manager_id = m.employee_id
  WHERE v.manager_id <> v.employee_id
)
SELECT name
FROM Vorgesetzte
ORDER BY level DESC;`,
    hints: [
      'Starten Sie im Basisfall beim direkten Vorgesetzten von Marlon (oder bei Marlon mit level = 0 und filtern am Ende level > 0).',
      'Wichtig: Prüfen Sie v.manager_id <> v.employee_id im Rekursionsschritt, da Ainslie (1) auf sich selbst zeigt!',
    ],
    solutionExplanation:
      'Der Pfad von Marlon (13) nach oben lautet: Jordan (10) → Fabriane (6) → Calista (3) → Ainslie (1). Absteigend nach level sortiert erscheint Ainslie zuerst.',
  },
  {
    id: 'emp-3-untergebene-calista',
    schemaId: 'employee',
    title: 'Alle Untergebenen von Calista (Top-Down-Rekursion)',
    source: 'Klausurtraining (nach Blatt 6 Aufg. 4b)',
    difficulty: 'Klausurniveau',
    topics: ['WITH RECURSIVE', 'Top-Down-Rekursion'],
    prompt:
      'Bestimmen Sie mittels rekursivem SQL die Namen aller direkten und indirekten Untergebenen von \'Calista\' (ohne Calista selbst). Sortieren Sie alphabetisch aufsteigend.',
    expectedColumns: ['name'],
    orderMatters: true,
    solutionSql: `WITH RECURSIVE Team(employee_id, name) AS (
  SELECT e.employee_id, e.name
  FROM employee e
  JOIN employee c ON e.manager_id = c.employee_id
  WHERE c.name = 'Calista'
    AND e.employee_id <> c.employee_id
  UNION
  SELECT e.employee_id, e.name
  FROM employee e
  JOIN Team t ON e.manager_id = t.employee_id
)
SELECT name
FROM Team
ORDER BY name ASC;`,
    hints: [
      'Gehen Sie diesmal von oben nach unten: Im Rekursionsschritt suchen Sie Mitarbeiter e mit e.manager_id = t.employee_id.',
      'Achten Sie darauf, Calista selbst nicht im Ergebnis auszugeben.',
    ],
    solutionExplanation:
      'Unter Calista (3) befinden sich Fabriane (6), Genevieve (7), Inari (9), Jordan (10), Marlon (13) und Nissa (14).',
  },
  {
    id: 'emp-4-hierarchie-tiefe',
    schemaId: 'employee',
    title: 'Hierarchie-Ebene jedes Mitarbeiters',
    source: 'Klausurtraining (Rekursive Tiefe)',
    difficulty: 'Klausurniveau',
    topics: ['WITH RECURSIVE', 'Level-Berechnung'],
    prompt:
      'Berechnen Sie für jeden Mitarbeiter seine Hierarchie-Ebene (level) ausgehend von der obersten Chefin \'Ainslie\' (level = 0). Geben Sie name und level (in dieser Reihenfolge) aus, sortiert aufsteigend nach level und bei Gleichstand alphabetisch nach name.',
    expectedColumns: ['name', 'level'],
    orderMatters: true,
    solutionSql: `WITH RECURSIVE Hierarchie(employee_id, name, level) AS (
  SELECT employee_id, name, 0
  FROM employee
  WHERE employee_id = manager_id
  UNION ALL
  SELECT e.employee_id, e.name, h.level + 1
  FROM employee e
  JOIN Hierarchie h ON e.manager_id = h.employee_id
  WHERE e.employee_id <> e.manager_id
)
SELECT name, level
FROM Hierarchie
ORDER BY level ASC, name ASC;`,
    hints: [
      'Die Wurzel erkennen Sie an WHERE employee_id = manager_id (oder name = \'Ainslie\') mit Startwert 0.',
      'Wichtig im rekursiven Teil: Schließen Sie e.employee_id <> e.manager_id aus, damit die Wurzel sich nicht erneut selbst joint!',
    ],
    solutionExplanation:
      'Ohne WHERE e.employee_id <> e.manager_id würde Ainslie im Rekursionsschritt wieder mit sich selbst gejoint und endlos level 1, 2, 3, ... erzeugen.',
  },
  {
    id: 'emp-5-teilbaum-gehaltssumme',
    schemaId: 'employee',
    title: 'Gehaltssumme eines Teilbaums (Calista inkl. Team)',
    source: 'Klausurtraining (Rekursion + Aggregation)',
    difficulty: 'Mittel',
    topics: ['WITH RECURSIVE', 'SUM'],
    prompt:
      'Berechnen Sie die gesamte Gehaltssumme (SUM(salary)) des Teilbaums unter \'Calista\' — inklusive Calistas eigenem Gehalt.',
    expectedColumns: ['Gesamtgehalt'],
    orderMatters: false,
    solutionSql: `WITH RECURSIVE Subtree(employee_id, salary) AS (
  SELECT employee_id, salary
  FROM employee
  WHERE name = 'Calista'
  UNION ALL
  SELECT e.employee_id, e.salary
  FROM employee e
  JOIN Subtree s ON e.manager_id = s.employee_id
  WHERE e.employee_id <> e.manager_id
)
SELECT SUM(salary) AS Gesamtgehalt
FROM Subtree;`,
    hints: [
      'Starten Sie die rekursive CTE direkt bei Calista (inkl. salary) und sammeln Sie alle Nachfolger ein.',
      'Summieren Sie in der äußeren Abfrage über SUM(salary).',
    ],
    solutionExplanation:
      'Calista (900k) + Fabriane (800k) + Genevieve (750k) + Inari (500k) + Jordan (100k) + Marlon (100k) + Nissa (100k) = 3.250.000,00.',
  },
];
