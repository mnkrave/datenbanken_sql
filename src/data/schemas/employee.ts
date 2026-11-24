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
  {
    id: 'emp-6-blaetter-ohne-untergebene',
    schemaId: 'employee',
    title: 'Mitarbeiter ohne Untergebene (Blätter im Baum)',
    source: 'Klausurtraining (Anti-Join auf Hierarchie)',
    difficulty: 'Basis',
    topics: ['NOT EXISTS', 'Anti-Join'],
    prompt:
      'Welche Mitarbeiter leiten selbst niemanden (sind Blätter in der Hierarchie)? Geben Sie deren `name` alphabetisch aufsteigend sortiert aus.',
    expectedColumns: ['name'],
    orderMatters: true,
    solutionSql: `SELECT e.name
FROM employee e
WHERE NOT EXISTS (
  SELECT *
  FROM employee sub
  WHERE sub.manager_id = e.employee_id
    AND sub.employee_id <> e.employee_id
)
ORDER BY e.name ASC;`,
    hints: ['Prüfen Sie per `NOT EXISTS`, dass kein anderer Mitarbeiter `manager_id = e.employee_id` besitzt.'],
    solutionExplanation: 'Electra, Genevieve, Inari, Khalil, Lisette, Marlon und Nissa haben keine Untergebenen.',
  },
  {
    id: 'emp-7-anzahl-direkte-untergebene',
    schemaId: 'employee',
    title: 'Anzahl direkter Untergebener je Manager',
    source: 'Klausurtraining (Self-Join + GROUP BY)',
    difficulty: 'Mittel',
    topics: ['Self-Join', 'GROUP BY', 'COUNT'],
    prompt:
      'Geben Sie für jeden Manager, der mindestens einen direkten Untergebenen (ungleich sich selbst!) hat, dessen `name` und die Anzahl direkter Untergebener aus. Sortieren Sie absteigend nach Anzahl und alphabetisch nach `name`.',
    expectedColumns: ['name', 'anzahl'],
    orderMatters: true,
    solutionSql: `SELECT m.name, COUNT(*) AS anzahl
FROM employee m
JOIN employee e ON e.manager_id = m.employee_id
WHERE e.employee_id <> m.employee_id
GROUP BY m.employee_id, m.name
ORDER BY anzahl DESC, m.name ASC;`,
    hints: [
      'Achtung Wurzel-Falle: Schließen Sie `e.employee_id <> m.employee_id` aus, sonst wird Ainslie als ihr eigener Untergebener mitgezählt!',
    ],
    solutionExplanation: 'Ainslie hat 3 direkte Untergebene (Briana, Calista, Delmar); Calista, Fabriane, Hunter und Jordan je 2; Briana und Delmar je 1.',
  },
  {
    id: 'emp-8-ueber-durchschnitt-salary',
    schemaId: 'employee',
    title: 'Mitarbeiter über dem Durchschnittsgehalt',
    source: 'Klausurtraining (Skalare Unterabfrage)',
    difficulty: 'Basis',
    topics: ['Unterabfrage', 'AVG', 'ORDER BY'],
    prompt:
      'Geben Sie `name` und `salary` aller Mitarbeiter aus, deren Gehalt strikt über dem Durchschnittsgehalt aller Mitarbeiter liegt. Sortieren Sie absteigend nach `salary` und alphabetisch nach `name`.',
    expectedColumns: ['name', 'salary'],
    orderMatters: true,
    solutionSql: `SELECT name, salary
FROM employee
WHERE salary > (SELECT AVG(salary) FROM employee)
ORDER BY salary DESC, name ASC;`,
    hints: ['Vergleichen Sie `salary > (SELECT AVG(salary) FROM employee)`.'],
    solutionExplanation: 'Das Durchschnittsgehalt liegt bei ca. 564.285,71 — alle 8 Führungskräfte ab 750.000 liegen darüber.',
  },
  {
    id: 'emp-9-vorgesetzte-khalil-distanz',
    schemaId: 'employee',
    title: 'Vorgesetzte von Khalil inkl. Abstand (WITH RECURSIVE)',
    source: 'Klausurtraining (nach Blatt 6 Aufg. 4b)',
    difficulty: 'Klausurniveau',
    topics: ['WITH RECURSIVE', 'Zyklenschutz'],
    prompt:
      'Finden Sie mittels rekursivem SQL alle direkten und indirekten Vorgesetzten von `\'Khalil\'` (ohne Khalil selbst) inklusive Hierarchie-Abstand (`distanz = 1` für den direkten Chef Hunter, `2` für Delmar, `3` für Ainslie). Geben Sie `name` und `distanz` aufsteigend nach `distanz` sortiert aus.',
    expectedColumns: ['name', 'distanz'],
    orderMatters: true,
    solutionSql: `WITH RECURSIVE Chain(employee_id, manager_id, name, distanz) AS (
  SELECT m.employee_id, m.manager_id, m.name, 1
  FROM employee e
  JOIN employee m ON e.manager_id = m.employee_id
  WHERE e.name = 'Khalil'
    AND e.employee_id <> e.manager_id
  UNION ALL
  SELECT m.employee_id, m.manager_id, m.name, c.distanz + 1
  FROM Chain c
  JOIN employee m ON c.manager_id = m.employee_id
  WHERE c.manager_id <> c.employee_id
)
SELECT name, distanz
FROM Chain
ORDER BY distanz ASC;`,
    hints: ['Denken Sie im Rekursionsschritt an `c.manager_id <> c.employee_id`, damit die Rekursion bei Ainslie stoppt.'],
    solutionExplanation: 'Khalil (11) → Hunter (1) → Delmar (2) → Ainslie (3).',
  },
  {
    id: 'emp-10-untergebene-delmar',
    schemaId: 'employee',
    title: 'Alle Untergebenen von Delmar (WITH RECURSIVE)',
    source: 'Klausurtraining (Top-Down-Rekursion)',
    difficulty: 'Mittel',
    topics: ['WITH RECURSIVE', 'Top-Down-Rekursion'],
    prompt:
      'Geben Sie mittels rekursivem SQL die Namen aller direkten und indirekten Untergebenen von `\'Delmar\'` (ohne Delmar selbst) alphabetisch aufsteigend aus.',
    expectedColumns: ['name'],
    orderMatters: true,
    solutionSql: `WITH RECURSIVE Team(employee_id, name) AS (
  SELECT e.employee_id, e.name
  FROM employee e
  JOIN employee d ON e.manager_id = d.employee_id
  WHERE d.name = 'Delmar'
    AND e.employee_id <> d.employee_id
  UNION
  SELECT e.employee_id, e.name
  FROM employee e
  JOIN Team t ON e.manager_id = t.employee_id
)
SELECT name
FROM Team
ORDER BY name ASC;`,
    hints: ['Starten Sie bei den direkten Untergebenen von Delmar und folgen Sie rekursiv `e.manager_id = t.employee_id`.'],
    solutionExplanation: 'Unter Delmar (4) arbeiten Hunter (8), Khalil (11) und Lisette (12).',
  },
  {
    id: 'emp-11-kollegen-von-marlon',
    schemaId: 'employee',
    title: 'Direkte Teamkollegen von Marlon',
    source: 'Klausurtraining (Self-Join)',
    difficulty: 'Basis',
    topics: ['Self-Join', 'WHERE'],
    prompt:
      'Welche anderen Mitarbeiter (ohne `\'Marlon\'` selbst) haben exakt denselben direkten Vorgesetzten (`manager_id`) wie `\'Marlon\'`? Geben Sie deren `name` aus.',
    expectedColumns: ['name'],
    orderMatters: false,
    solutionSql: `SELECT e.name
FROM employee e
JOIN employee m ON e.manager_id = m.manager_id
WHERE m.name = 'Marlon'
  AND e.employee_id <> m.employee_id;`,
    hints: ['Joinen Sie `employee` mit sich selbst über gleiche `manager_id` und schließen Sie Marlon mit `<>` aus.'],
    solutionExplanation: 'Nur Nissa (14) hat ebenso wie Marlon (13) Jordan (10) als direkten Manager.',
  },
  {
    id: 'emp-12-gehaltsrangliste',
    schemaId: 'employee',
    title: 'Gehalts-Rangliste mit Gleichständen (RANK() OVER)',
    source: 'Klausurtraining (Window Function)',
    difficulty: 'Mittel',
    topics: ['Window Function', 'RANK() OVER'],
    prompt:
      'Erstellen Sie eine Rangliste aller Mitarbeiter absteigend nach `salary` mittels `RANK() OVER (ORDER BY salary DESC)`. Geben Sie `name`, `salary` und `rang` sortiert nach `rang` aufsteigend und `name` aufsteigend aus.',
    expectedColumns: ['name', 'salary', 'rang'],
    orderMatters: true,
    solutionSql: `SELECT name, salary, RANK() OVER (ORDER BY salary DESC) AS rang
FROM employee
ORDER BY rang ASC, name ASC;`,
    hints: ['Bei `RANK()` teilen sich gleich hohe Gehälter denselben Rang, und der nächste Rang springt (z. B. 1, 2, 2, 2, 5, …).'],
    solutionExplanation:
      'Demonstriert das Sprungverhalten von `RANK()` aus VL 19: Drei Manager teilen sich Rang 2 (900k), daher startet der nächste Rang bei 5.',
  },
  {
    id: 'emp-13-teilbaum-groesse-abteilungsleiter',
    schemaId: 'employee',
    title: 'Teamgröße unter jedem Bereichsleiter (Rekursion + GROUP BY)',
    source: 'Klausurtraining (WITH RECURSIVE + Aggregation)',
    difficulty: 'Klausurniveau',
    topics: ['WITH RECURSIVE', 'GROUP BY', 'COUNT'],
    prompt:
      'Berechnen Sie für jeden direkten Untergebenen der Chefin `\'Ainslie\'` (`Briana`, `Calista`, `Delmar`) dessen `name` und die Gesamtanzahl aller direkten und indirekten Mitarbeiter in dessen Teilbaum (ohne den Bereichsleiter selbst). Sortieren Sie absteigend nach Teamgröße.',
    expectedColumns: ['name', 'teamgroesse'],
    orderMatters: true,
    solutionSql: `WITH RECURSIVE Bereich(leiter_id, leiter_name, member_id) AS (
  SELECT l.employee_id, l.name, e.employee_id
  FROM employee l
  JOIN employee root ON l.manager_id = root.employee_id
  JOIN employee e ON e.manager_id = l.employee_id
  WHERE root.name = 'Ainslie'
    AND l.employee_id <> root.employee_id
  UNION ALL
  SELECT b.leiter_id, b.leiter_name, e.employee_id
  FROM Bereich b
  JOIN employee e ON e.manager_id = b.member_id
)
SELECT leiter_name AS name, COUNT(*) AS teamgroesse
FROM Bereich
GROUP BY leiter_id, leiter_name
ORDER BY teamgroesse DESC;`,
    hints: [
      'Tragen Sie `leiter_id` und `leiter_name` als feste Spalten durch die Rekursion mit, während `member_id` den Teilbaum hinabsteigt.',
      'Gruppieren Sie am Ende nach `(leiter_id, leiter_name)` und zählen Sie `COUNT(*)`.',
    ],
    solutionExplanation: 'Calista führt 6 Mitarbeiter, Delmar 3 und Briana 1 (Electra).',
  },
];
