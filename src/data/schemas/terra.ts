import type { Exercise, SchemaDef } from '../../types/sql';
import { TERRA_SEED_SQL } from './terraSeed';

export const terraSchema: SchemaDef = {
  id: 'terra',
  title: 'Terra-Datenbank (Geographie-DB)',
  shortTitle: 'Terra-DB',
  sheets: 'Übungsblatt 5 (Aufg. 5) · Übungsblatt 6 (Aufg. 1 & 5)',
  summary:
    'Die originale Terra-Datenbank (terra2) aus Blatt 5 und Blatt 6 mit allen 29 Tabellen — Ländern, Kontinenten, Landesteilen, Städten, Bergen, Ebenen, Wüsten, Inseln, Gewässern (See/Fluss/Meer/Flussquelle), Flughäfen, Flügen und internationalen Organisationen.',
  explanationBullets: [
    'Tabellen mit Substantiv-Namen modellieren geographische Objekte (z. B. Land, Landesteil, Stadt, Berg, Ebene, Wueste, Insel, Organisation, Flughafen, Flug).',
    'Schlüssel und Fremdschlüssel enden auf _ID und beginnen mit dem Tabellenkürzel (alle als SMALLINT): L_ID (Land), LT_ID (Landesteil), K_ID (Kontinent), S_ID (Stadt), B_ID (Berg), E_ID (Ebene), W_ID (Wueste), I_ID (Insel), G_ID (Gewaesser), O_ID (Organisation), FH_ID (Flughafen).',
    'Ein Land besteht aus einem oder mehreren Landesteilen (Landesteil.L_ID → Land.L_ID) und hat eine Hauptstadt (Land.Hauptstadt → Stadt.S_ID).',
    'Gewaesser modelliert den Obertyp (G_ID, Name) der Generalisierung mit den Untertypen See (Tiefe, Flaeche), Fluss (Laenge) und Meer (Tiefe).',
    'Die Tabellen geo_Berg, geo_Ebene, geo_Wueste, geo_Insel und geo_Gewaesser ordnen geographische Objekte einem oder mehreren Landesteilen (LT_ID) zu.',
    'benachbart(L_ID1, L_ID2) speichert gemeinsame Landesgrenzen, muendet(G_ID, Muendung_G_ID) Flussmündungen, geht_ueber(G_ID1, G_ID2) angrenzende Meere, gehoert_LT(S_ID, LT_ID) Stadt-Landesteile und liegt_an(S_ID, G_ID) Städte an Gewässern.',
    'Organisationen haben ihren Sitz in einer Stadt (hat_Sitz_in(S_ID, O_ID)); Länder sind Mitglied über ist_Mitglied(L_ID, O_ID, Art); umfasst(L_ID, K_ID, Prozent) ordnet Länder Kontinenten zu.',
  ],
  examNotes: [
    'KRITISCHE FALLE 1: Die Tabelle benachbart ist NICHT symmetrisch! Steht (L_ID1, L_ID2) darin, fehlt die Gegenrichtung — Sie müssen immer beide Richtungen prüfen (OR oder symmetrisches UNION)!',
    'KRITISCHE FALLE 2: Kontinent.Flaeche ist in Millionen km² gespeichert, Wueste.Flaeche aber in km²! Bei Quotienten zusätzlich auf Fließkomma-Division (z. B. * 1000000.0) achten.',
    'PostgreSQL unterstützt (anders als SQLite) auch > ALL (...) und = ANY (...) sowie WITH RECURSIVE und RANK() OVER (...).',
  ],
  tables: [
    {
      name: 'Kontinent',
      description: 'Kontinente (Flaeche in Mio. km²!)',
      columns: [
        { name: 'K_ID', type: 'SMALLINT', isPk: true },
        { name: 'Name', type: 'VARCHAR(10)' },
        { name: 'Flaeche', type: 'DECIMAL(14,2)', note: 'in 1.000.000 km²' },
      ],
    },
    {
      name: 'Land',
      description: 'Staaten mit Einwohnern, Fläche (km²) und Hauptstadt',
      columns: [
        { name: 'L_ID', type: 'SMALLINT', isPk: true },
        { name: 'Name', type: 'VARCHAR(32)' },
        { name: 'Einwohner', type: 'INT', note: 'NULL möglich' },
        { name: 'Flaeche', type: 'DECIMAL(14,2)', note: 'in km²' },
        { name: 'Hauptstadt', type: 'SMALLINT', fkTarget: 'Stadt.S_ID' },
      ],
    },
    {
      name: 'umfasst',
      description: 'Zuordnung Land ↔ Kontinent (mit Flächenanteil)',
      columns: [
        { name: 'L_ID', type: 'SMALLINT', isPk: true, fkTarget: 'Land.L_ID' },
        { name: 'K_ID', type: 'SMALLINT', isPk: true, fkTarget: 'Kontinent.K_ID' },
        { name: 'Prozent', type: 'DECIMAL(14,2)' },
      ],
    },
    {
      name: 'Landesteil',
      description: 'Bundesländer, Provinzen oder Regionen eines Landes',
      columns: [
        { name: 'LT_ID', type: 'SMALLINT', isPk: true },
        { name: 'Name', type: 'VARCHAR(30)' },
        { name: 'L_ID', type: 'SMALLINT', fkTarget: 'Land.L_ID' },
      ],
    },
    {
      name: 'Stadt',
      description: 'Städte mit Koordinaten und Einwohnerzahl (kann NULL sein)',
      columns: [
        { name: 'S_ID', type: 'SMALLINT', isPk: true },
        { name: 'Name', type: 'VARCHAR(25)' },
        { name: 'Einwohner', type: 'INT', note: 'NULL möglich' },
        { name: 'Laenge', type: 'DECIMAL(14,2)' },
        { name: 'Breite', type: 'DECIMAL(14,2)' },
      ],
    },
    {
      name: 'gehoert_LT',
      description: 'Zuordnung Stadt → Landesteil',
      columns: [
        { name: 'S_ID', type: 'SMALLINT', isPk: true, fkTarget: 'Stadt.S_ID' },
        { name: 'LT_ID', type: 'SMALLINT', isPk: true, fkTarget: 'Landesteil.LT_ID' },
      ],
    },
    {
      name: 'Berg / geo_Berg',
      description: 'Berge (B_ID, Name, Gebirge, Hoehe) und Zuordnung (LT_ID, B_ID)',
      columns: [
        { name: 'B_ID', type: 'SMALLINT', isPk: true },
        { name: 'Name', type: 'VARCHAR(20)' },
        { name: 'Hoehe', type: 'DECIMAL(14,2)', note: 'in Metern' },
      ],
    },
    {
      name: 'Wueste / geo_Wueste',
      description: 'Wüsten (W_ID, Name, Flaeche in km², Wuestenart) & Zuordnung (LT_ID, W_ID)',
      columns: [
        { name: 'W_ID', type: 'SMALLINT', isPk: true },
        { name: 'Name', type: 'VARCHAR(25)' },
        { name: 'Flaeche', type: 'DECIMAL(14,2)', note: 'in km² (NULL möglich)' },
      ],
    },
    {
      name: 'Insel / geo_Insel',
      description: 'Inseln (I_ID, Name, Inselgruppe, Flaeche) und Zuordnung (LT_ID, I_ID)',
      columns: [
        { name: 'I_ID', type: 'SMALLINT', isPk: true },
        { name: 'Name', type: 'VARCHAR(25)' },
        { name: 'Flaeche', type: 'DECIMAL(14,2)' },
      ],
    },
    {
      name: 'Gewaesser / See / Fluss / Meer',
      description: 'Generalisierung Gewässer (G_ID, Name) + Untertypen + geo_Gewaesser, liegt_an, muendet, geht_ueber',
      columns: [
        { name: 'G_ID', type: 'SMALLINT', isPk: true },
        { name: 'Name', type: 'VARCHAR(25)' },
        { name: 'Tiefe / Laenge', type: 'DECIMAL(14,2)', note: 'See.Tiefe, Meer.Tiefe, Fluss.Laenge' },
      ],
    },
    {
      name: 'benachbart',
      description: 'Landesgrenzen zwischen zwei Ländern (NICHT symmetrisch!)',
      columns: [
        { name: 'L_ID1', type: 'SMALLINT', isPk: true, fkTarget: 'Land.L_ID' },
        { name: 'L_ID2', type: 'SMALLINT', isPk: true, fkTarget: 'Land.L_ID' },
      ],
    },
    {
      name: 'Organisation / hat_Sitz_in / ist_Mitglied',
      description: 'Organisationen (O_ID, Name, Abkuerzung), Sitzstadt (S_ID, O_ID) und Mitgliedsländer (L_ID, O_ID, Art)',
      columns: [
        { name: 'O_ID', type: 'SMALLINT', isPk: true },
        { name: 'Name', type: 'VARCHAR(70)' },
        { name: 'Abkuerzung', type: 'VARCHAR(20)' },
      ],
    },
    {
      name: 'Ebene / Flughafen / Flug / Flussquelle',
      description: 'Zusatztabellen der TerraDB (geo_Ebene, Flughafen(FH_ID, Code, S_ID), Flug, Flussquelle)',
      columns: [
        { name: 'E_ID / FH_ID / Flug_ID', type: 'SMALLINT', isPk: true },
      ],
    },
  ],
  seedSql: TERRA_SEED_SQL,
};

export const terraExercises: Exercise[] = [
  {
    id: 'terra-1-usa-nachbarn',
    schemaId: 'terra',
    title: 'Direkte Nachbarländer der USA (Asymmetrie-Falle!)',
    source: 'Übungsblatt 5 · Aufg. 5(a)',
    difficulty: 'Basis',
    topics: ['JOIN', 'Asymmetrische Relation', 'UNION / OR'],
    prompt:
      'Bestimmen Sie die Namen aller direkten Nachbarländer, die von den \'USA\' auf dem Landweg zu erreichen sind. Achtung: Die Relation benachbart ist nicht symmetrisch!',
    expectedColumns: ['Name'],
    orderMatters: false,
    requiresDistinct: true,
    solutionSql: `SELECT l.Name
FROM Land l, Land l2, benachbart b
WHERE l2.Name = 'USA'
  AND (
    (l.L_ID = b.L_ID1 AND b.L_ID2 = l2.L_ID)
    OR (l.L_ID = b.L_ID2 AND b.L_ID1 = l2.L_ID)
  );`,
    alternativeSolutions: [
      `SELECT l.Name FROM Land l WHERE l.L_ID IN (
        SELECT b.L_ID1 FROM benachbart b JOIN Land l2 ON b.L_ID2 = l2.L_ID WHERE l2.Name = 'USA'
        UNION
        SELECT b.L_ID2 FROM benachbart b JOIN Land l2 ON b.L_ID1 = l2.L_ID WHERE l2.Name = 'USA'
      );`,
    ],
    hints: [
      'In benachbart steht (\'CA\', \'US\'), aber (\'US\', \'MX\') — wenn Sie nur L_ID1 = \'US\' prüfen, fehlt Kanada!',
      'Prüfen Sie beide Richtungen mittels OR oder UNION.',
    ],
    solutionExplanation:
      'Weil benachbart jede Grenze nur in einer Richtung speichert, müssen sowohl (L_ID1 = USA) als auch (L_ID2 = USA) abgefragt werden → Kanada und Mexiko.',
  },
  {
    id: 'terra-2-organisation-sitz',
    schemaId: 'terra',
    title: 'Sitz-Stadt und Land jeder Organisation',
    source: 'Übungsblatt 5 · Aufg. 5(b)',
    difficulty: 'Basis',
    topics: ['5-Wege-JOIN'],
    prompt:
      'Geben Sie für jede Organisation deren Namen, die Stadt und das Land (in dieser Reihenfolge) an, in dem die Organisation ihren Sitz hat. Organisationen ohne Sitz sollen nicht auftauchen.',
    expectedColumns: ['Organisation', 'Stadt', 'Land'],
    orderMatters: false,
    solutionSql: `SELECT o.Name, s.Name, l.Name
FROM Organisation o
JOIN hat_Sitz_in h ON o.O_ID = h.O_ID
JOIN Stadt s ON h.S_ID = s.S_ID
JOIN gehoert_LT glt ON s.S_ID = glt.S_ID
JOIN Landesteil lt ON glt.LT_ID = lt.LT_ID
JOIN Land l ON lt.L_ID = l.L_ID;`,
    hints: [
      'Folgen Sie dem Pfad im Schema-Graphen: Organisation → hat_Sitz_in → Stadt → gehoert_LT → Landesteil → Land.',
      'Durch INNER JOINs entfallen Organisationen ohne Sitz (wie SOLO) automatisch.',
    ],
    solutionExplanation:
      'Übt den typischen Pfad-Join durch das Terra-Schema über die Zuordnungstabelle gehoert_LT und Landesteil.',
  },
  {
    id: 'terra-3-berge-pro-land',
    schemaId: 'terra',
    title: 'Anzahl der Berge und höchster Berg pro Land',
    source: 'Übungsblatt 5 · Aufg. 5(c)',
    difficulty: 'Mittel',
    topics: ['JOIN', 'GROUP BY', 'COUNT', 'MAX', 'ORDER BY'],
    prompt:
      'Geben Sie für jedes Land (mit mindestens einem Berg) dessen Namen, die Anzahl der Berge sowie die Höhe des höchsten Berges (in dieser Reihenfolge) aus. Sortieren Sie absteigend nach der Höhe des höchsten Berges.',
    expectedColumns: ['Name', 'AnzahlBerge', 'HoechsterBerg'],
    orderMatters: true,
    solutionSql: `SELECT l.Name, COUNT(*) AS AnzahlBerge, MAX(b.Hoehe) AS HoechsterBerg
FROM Land l
JOIN Landesteil lt ON lt.L_ID = l.L_ID
JOIN geo_Berg gb ON gb.LT_ID = lt.LT_ID
JOIN Berg b ON b.B_ID = gb.B_ID
GROUP BY l.L_ID, l.Name
ORDER BY HoechsterBerg DESC;`,
    hints: [
      'Verbinden Sie Land → Landesteil → geo_Berg → Berg.',
      'Gruppieren Sie nach Land und sortieren Sie mit ORDER BY MAX(b.Hoehe) DESC.',
    ],
    solutionExplanation:
      'Volksrepublik China führt mit dem Mount Everest (8848 m), gefolgt von Frankreich (Mont Blanc) und der Schweiz (Dufourspitze, 2 Berge).',
  },
  {
    id: 'terra-4-hauptstaedte-fluss',
    schemaId: 'terra',
    title: 'Hauptstädte an einem Fluss (Generalisierung)',
    source: 'Übungsblatt 5 · Aufg. 5(d)',
    difficulty: 'Mittel',
    topics: ['Generalisierung', 'JOIN', 'ORDER BY'],
    prompt:
      'Welche Hauptstädte liegen an einem Fluss? Geben Sie den Namen des Flusses sowie den Namen der Hauptstadt (in dieser Reihenfolge) an. Sortieren Sie alphabetisch aufsteigend nach Flussname und Stadtname.',
    expectedColumns: ['Fluss', 'Hauptstadt'],
    orderMatters: true,
    solutionSql: `SELECT g.Name, s.Name
FROM Fluss f
JOIN Gewaesser g ON f.G_ID = g.G_ID
JOIN liegt_an la ON g.G_ID = la.G_ID
JOIN Stadt s ON la.S_ID = s.S_ID
JOIN Land l ON s.S_ID = l.Hauptstadt
ORDER BY g.Name ASC, s.Name ASC;`,
    hints: [
      'Der Name eines Flusses steht im Obertyp Gewaesser, während die Tabelle Fluss filtert, dass es sich tatsächlich um einen Fluss handelt!',
      'Eine Stadt ist Hauptstadt genau dann, wenn s.S_ID = l.Hauptstadt gilt.',
    ],
    solutionExplanation:
      'Zeigt den Umgang mit Generalisierung im relationalen Schema: Join über G_ID zwischen Fluss (Untertyp) und Gewaesser (Obertyp). Liefert u. a. Donau (Budapest), Moldau (Prag), Niger (Bamako) und Spree (Berlin).',
  },
  {
    id: 'terra-5-laender-ohne-wuesten',
    schemaId: 'terra',
    title: 'Länder ohne Wüsten',
    source: 'Übungsblatt 5 · Aufg. 5(e)',
    difficulty: 'Mittel',
    topics: ['NOT EXISTS', 'Anti-Join'],
    prompt: 'Bestimmen Sie die Namen aller Länder, in denen sich keine Wüsten befinden.',
    expectedColumns: ['Name'],
    orderMatters: false,
    requiresDistinct: true,
    solutionSql: `SELECT l.Name
FROM Land l
WHERE NOT EXISTS (
  SELECT 1
  FROM Landesteil lt
  JOIN geo_Wueste gw ON gw.LT_ID = lt.LT_ID
  WHERE lt.L_ID = l.L_ID
);`,
    hints: [
      'Wüsten hängen über geo_Wueste an Landesteil, nicht direkt an Land.',
      'Prüfen Sie per korreliertem NOT EXISTS, dass kein Landesteil des Landes in geo_Wueste vorkommt.',
    ],
    solutionExplanation: 'Länder ohne Wüsten bleiben über NOT EXISTS übrig (159 Länder in der TerraDB).',
  },
  {
    id: 'terra-6-groesste-organisation',
    schemaId: 'terra',
    title: 'Organisation mit den meisten Mitgliedstaaten',
    source: 'Übungsblatt 5 · Aufg. 5(g)',
    difficulty: 'Mittel',
    topics: ['WITH / CTE', 'GROUP BY', 'MAX'],
    prompt:
      'Bestimmen Sie den Namen und die Mitgliederzahl (in dieser Reihenfolge) der Organisation mit den meisten Mitgliedstaaten.',
    expectedColumns: ['Name', 'Mitglieder'],
    orderMatters: false,
    solutionSql: `WITH anzahlMitglieder AS (
  SELECT o.Name, COUNT(*) AS Mitglieder
  FROM Organisation o
  JOIN ist_Mitglied i ON o.O_ID = i.O_ID
  GROUP BY o.O_ID, o.Name
)
SELECT Name, Mitglieder
FROM anzahlMitglieder
WHERE Mitglieder = (SELECT MAX(Mitglieder) FROM anzahlMitglieder);`,
    hints: [
      'Berechnen Sie zunächst in einer WITH-CTE die Mitgliederzahl pro Organisation.',
      'Wählen Sie anschließend die Zeile(n), deren Mitgliederzahl gleich dem Maximum der CTE ist (besser als LIMIT 1, da Gleichstände sauber erfasst werden!).',
    ],
    solutionExplanation:
      'Eine CTE mit anschließender MAX-Abfrage behandelt auch Gleichstände korrekt (im Gegensatz zu bloßem ORDER BY ... LIMIT 1).',
  },
  {
    id: 'terra-7-inselstaaten',
    schemaId: 'terra',
    title: 'Inselstaaten und Anzahl ihrer Inseln',
    source: 'Übungsblatt 5 · Aufg. 5(h)',
    difficulty: 'Klausurniveau',
    topics: ['NOT EXISTS', 'COUNT(DISTINCT)', 'Asymmetrie'],
    prompt:
      'Geben Sie die Namen aller Inselstaaten und die Anzahl der Inseln (in dieser Reihenfolge) aus, aus denen diese Staaten jeweils bestehen (nur Staaten mit mindestens einer Insel in geo_Insel). Hinweis: Inselstaaten grenzen an kein anderes Land. Sortieren Sie alphabetisch nach Landesname.',
    expectedColumns: ['Name', 'AnzahlInseln'],
    orderMatters: true,
    solutionSql: `SELECT l.Name, COUNT(DISTINCT g.I_ID) AS AnzahlInseln
FROM Land l
JOIN Landesteil lt ON l.L_ID = lt.L_ID
JOIN geo_Insel g ON lt.LT_ID = g.LT_ID
WHERE NOT EXISTS (
  SELECT *
  FROM benachbart b
  WHERE b.L_ID1 = l.L_ID OR b.L_ID2 = l.L_ID
)
GROUP BY l.L_ID, l.Name
ORDER BY l.Name ASC;`,
    hints: [
      'Ein Land ist ein Inselstaat, wenn seine L_ID weder in benachbart.L_ID1 noch in benachbart.L_ID2 vorkommt!',
      'Zählen Sie Inseln über geo_Insel mit COUNT(DISTINCT g.I_ID), falls eine Insel sich über mehrere Landesteile erstreckt.',
    ],
    solutionExplanation:
      'Australien, Island, Japan u. v. a. (insgesamt 38 Inselstaaten mit erfassten Inseln) grenzen in benachbart an kein anderes Land.',
  },
  {
    id: 'terra-8-rangliste-europa',
    schemaId: 'terra',
    title: 'Flächen-Rangliste Europas (Window Function)',
    source: 'Übungsblatt 5 · Aufg. 5(i)',
    difficulty: 'Mittel',
    topics: ['Window Function', 'RANK() OVER', 'JOIN'],
    prompt:
      'Erstellen Sie eine Rangliste der Länder in \'Europa\' absteigend nach ihrer Fläche (größtes Land hat Rang 1). Geben Sie Name und Rang (in dieser Reihenfolge) aufsteigend sortiert nach Rang aus.',
    expectedColumns: ['Name', 'Rang'],
    orderMatters: true,
    solutionSql: `SELECT l.Name, RANK() OVER (ORDER BY l.Flaeche DESC) AS Rang
FROM Land l
JOIN umfasst u ON l.L_ID = u.L_ID
JOIN Kontinent k ON u.K_ID = k.K_ID
WHERE k.Name = 'Europa'
ORDER BY Rang ASC;`,
    hints: [
      'Verbinden Sie Land → umfasst → Kontinent und filtern Sie auf k.Name = \'Europa\'.',
      'Nutzen Sie die Window Function RANK() OVER (ORDER BY l.Flaeche DESC) (oder alternativ den Self-Join mit COUNT(*) aus Blatt 5 Lsg.).',
    ],
    solutionExplanation:
      'RANK() OVER (ORDER BY l.Flaeche DESC) erzeugt direkt die Rangliste der 35 europäischen Länder mit Sowjetunion (1), Tuerkei (2), Frankreich (3), Spanien (4) usw.',
  },
  {
    id: 'terra-9-wuesten-gross',
    schemaId: 'terra',
    title: 'Wüsten mit „Gross“ im Namen (LIKE)',
    source: 'Übungsblatt 6 · Aufg. 5(a)',
    difficulty: 'Basis',
    topics: ['LIKE', 'ORDER BY'],
    prompt:
      'Bestimmen Sie die Namen aller Wüsten, die an irgendeiner Stelle den Teilstring \'Gross\' enthalten. Sortieren Sie alphabetisch absteigend.',
    expectedColumns: ['Name'],
    orderMatters: true,
    solutionSql: `SELECT Name
FROM Wueste
WHERE Name LIKE '%Gross%'
ORDER BY Name DESC;`,
    hints: ['Verwenden Sie den LIKE-Operator mit dem Platzhalter % vor und nach Gross.'],
    solutionExplanation: 'LIKE \'%Gross%\' findet 5 Wüsten (u. a. Grosse Sandwueste, Grosse Victoriawueste, Westl./Oestl. Grosser Erg).',
  },
  {
    id: 'terra-10-flache-meere-tiefe-seen',
    schemaId: 'terra',
    title: 'Flache Meere (< 200 m) vs. tiefere Seen',
    source: 'Übungsblatt 6 · Aufg. 5(e)',
    difficulty: 'Mittel',
    topics: ['Theta-Join', 'Generalisierung', 'GROUP BY'],
    prompt:
      'Geben Sie die Namen aller Meere aus, die weniger als 200 Meter tief sind, sowie für jedes dieser Meere die Anzahl der Seen, die tiefer sind als das Meer (in dieser Reihenfolge). Sortieren Sie absteigend nach Anzahl und bei Gleichstand aufsteigend nach Meername.',
    expectedColumns: ['Name', 'Anzahl'],
    orderMatters: true,
    solutionSql: `SELECT g.Name, COUNT(DISTINCT s.G_ID) AS Anzahl
FROM Meer m
JOIN Gewaesser g ON m.G_ID = g.G_ID
JOIN See s ON s.Tiefe > m.Tiefe
WHERE m.Tiefe < 200
GROUP BY g.G_ID, g.Name
ORDER BY Anzahl DESC, g.Name ASC;`,
    hints: [
      'Verbinden Sie Meer mit Gewaesser (für den Namen) und mit See über die Nicht-Gleichheitsbedingung s.Tiefe > m.Tiefe.',
      'Gruppieren Sie nach dem Meer und zählen Sie COUNT(DISTINCT s.G_ID).',
    ],
    solutionExplanation:
      'Die 4 Meere unter 200 m (Asowsches Meer, Tschuktschensee, Persischer Golf, Nordsee) werden jeweils mit allen Seen verglichen, die tiefer als das Meer sind.',
  },
  {
    id: 'terra-11-staedte-groesser-china',
    schemaId: 'terra',
    title: 'Städte größer als ALLE Städte in China (> ALL + NULL!)',
    source: 'Übungsblatt 6 · Aufg. 5(f)',
    difficulty: 'Klausurniveau',
    topics: ['> ALL', 'NULL-Semantik / 3VL', 'WITH / CTE'],
    prompt:
      'Finden Sie die Namen aller Städte, die mehr Einwohner haben als alle Städte in der \'Volksrepublik China\'. Berücksichtigen Sie nur Städte, für die eine Einwohnerzahl bekannt ist.',
    expectedColumns: ['Name'],
    orderMatters: false,
    requiresDistinct: true,
    solutionSql: `SELECT DISTINCT s.Name
FROM Stadt s
WHERE s.Einwohner IS NOT NULL
  AND s.Einwohner > ALL (
    SELECT s2.Einwohner
    FROM Stadt s2
    JOIN gehoert_LT glt ON s2.S_ID = glt.S_ID
    JOIN Landesteil lt ON glt.LT_ID = lt.LT_ID
    JOIN Land l ON lt.L_ID = l.L_ID
    WHERE l.Name = 'Volksrepublik China'
      AND s2.Einwohner IS NOT NULL
  );`,
    alternativeSolutions: [
      `SELECT DISTINCT s.Name FROM Stadt s WHERE s.Einwohner > (
        SELECT MAX(s2.Einwohner)
        FROM Stadt s2 JOIN gehoert_LT glt ON s2.S_ID = glt.S_ID
        JOIN Landesteil lt ON glt.LT_ID = lt.LT_ID
        JOIN Land l ON lt.L_ID = l.L_ID
        WHERE l.Name = 'Volksrepublik China'
      );`,
    ],
    hints: [
      'In PostgreSQL funktioniert das Standard-SQL-Konstrukt > ALL (SELECT ...) direkt!',
      'Klausurfalle NULL: Wenn in der Unterabfrage ein NULL-Wert steckt, liefert x > ALL (...) unknown (also falsch)! Filtern Sie daher s2.Einwohner IS NOT NULL.',
    ],
    solutionExplanation:
      'Im Original-Datensatz hat nur Mexico City mehr Einwohner als alle chinesischen Städte (inkl. Shanghai).',
  },
  {
    id: 'terra-12-landesteile-alles',
    schemaId: 'terra',
    title: 'Landesteile mit Wüste, Insel UND Gewässer (= ANY / IN)',
    source: 'Übungsblatt 6 · Aufg. 5(g)',
    difficulty: 'Mittel',
    topics: ['= ANY', 'IN', 'EXISTS'],
    prompt:
      'Finden Sie die Namen aller Landesteile, die an mindestens einer Wüste, mindestens einer Insel und mindestens einem Gewässer liegen. Sortieren Sie alphabetisch aufsteigend.',
    expectedColumns: ['Name'],
    orderMatters: true,
    solutionSql: `SELECT Name
FROM Landesteil
WHERE LT_ID = ANY (SELECT LT_ID FROM geo_Wueste)
  AND LT_ID = ANY (SELECT LT_ID FROM geo_Insel)
  AND LT_ID = ANY (SELECT LT_ID FROM geo_Gewaesser)
ORDER BY Name ASC;`,
    alternativeSolutions: [
      `SELECT Name FROM Landesteil WHERE LT_ID IN (SELECT LT_ID FROM geo_Wueste) AND LT_ID IN (SELECT LT_ID FROM geo_Insel) AND LT_ID IN (SELECT LT_ID FROM geo_Gewaesser) ORDER BY Name ASC;`,
    ],
    hints: [
      'Prüfen Sie für LT_ID drei Bedingungen gegen geo_Wueste, geo_Insel und geo_Gewaesser (= ANY, IN oder EXISTS).',
    ],
    solutionExplanation:
      'In der TerraDB erfüllen genau zwei australische Landesteile alle drei Bedingungen: Nordterritorium und Suedaustralien.',
  },
  {
    id: 'terra-13-rekursiv-deutschland',
    schemaId: 'terra',
    title: 'Direkte & indirekte Nachbarländer Deutschlands (WITH RECURSIVE)',
    source: 'Übungsblatt 6 · Aufg. 1',
    difficulty: 'Klausurniveau',
    topics: ['WITH RECURSIVE', 'Symmetrisierung', 'Transitive Hülle'],
    prompt:
      'Bestimmen Sie mittels rekursivem SQL die Namen aller direkten und indirekten Nachbarländer der \'Bundesrepublik Deutschland\' (ohne Deutschland selbst). Sortieren Sie alphabetisch aufsteigend.',
    expectedColumns: ['Name'],
    orderMatters: true,
    requiresDistinct: true,
    solutionSql: `WITH RECURSIVE
benachbartSymm(L_ID1, L_ID2) AS (
  SELECT L_ID1, L_ID2 FROM benachbart
  UNION
  SELECT L_ID2, L_ID1 FROM benachbart
),
erreichbar(L_ID) AS (
  SELECT b.L_ID2
  FROM benachbartSymm b
  JOIN Land l ON b.L_ID1 = l.L_ID
  WHERE l.Name = 'Bundesrepublik Deutschland'
  UNION
  SELECT b.L_ID2
  FROM erreichbar e
  JOIN benachbartSymm b ON e.L_ID = b.L_ID1
)
SELECT l.Name
FROM erreichbar e
JOIN Land l ON e.L_ID = l.L_ID
WHERE l.Name <> 'Bundesrepublik Deutschland'
ORDER BY l.Name ASC;`,
    hints: [
      'Schritt 1: Bauen Sie eine symmetrische CTE benachbartSymm mit UNION aus (L_ID1, L_ID2) und (L_ID2, L_ID1).',
      'Schritt 2: Berechnen Sie per WITH RECURSIVE ... UNION (nicht UNION ALL, wegen Zyklen im Ländergraph!) alle erreichbaren L_IDs und schließen Sie Deutschland am Ende aus.',
    ],
    solutionExplanation:
      'Genau wie auf Blatt 6 Aufg. 1: Durch UNION statt UNION ALL terminiert die Rekursion trotz Zyklen garantiert. Über die Landbrücken (Eurasien + Afrika) sind von Deutschland 131 Länder erreichbar.',
  },
  {
    id: 'terra-14-orgs-ueber-20',
    schemaId: 'terra',
    title: 'Organisationen mit mehr als 20 Mitgliedern (HAVING)',
    source: 'Übungsblatt 5 · Aufg. 5(f)',
    difficulty: 'Mittel',
    topics: ['GROUP BY', 'HAVING', 'COUNT', 'ORDER BY'],
    prompt:
      'Bestimmen Sie die Namen und die Mitgliederzahl (in dieser Reihenfolge) aller Organisationen, die mehr als 20 Mitglieder haben. Sortieren Sie die Ergebnisse absteigend nach der Mitgliederzahl.',
    expectedColumns: ['Name', 'Mitglieder'],
    orderMatters: true,
    solutionSql: `SELECT o.Name, COUNT(*) AS Mitglieder
FROM Organisation o
JOIN ist_Mitglied i ON i.O_ID = o.O_ID
GROUP BY o.O_ID, o.Name
HAVING COUNT(*) > 20
ORDER BY COUNT(*) DESC;`,
    alternativeSolutions: [
      `WITH anzahlMitglieder AS (
  SELECT o.Name, COUNT(*) AS mitglieder
  FROM Organisation o, ist_Mitglied i
  WHERE i.O_ID = o.O_ID
  GROUP BY o.O_ID, o.Name
)
SELECT Name, mitglieder
FROM anzahlMitglieder
WHERE mitglieder > 20
ORDER BY mitglieder DESC;`,
    ],
    hints: [
      'Verbinden Sie `Organisation` und `ist_Mitglied` über `O_ID` und gruppieren Sie nach der Organisation.',
      'Gruppenbedingungen wie `COUNT(*) > 20` gehören in `HAVING` (oder in eine `WITH`-CTE), niemals in `WHERE`.',
    ],
    solutionExplanation:
      'In der Terra-Datenbank überschreiten genau 5 Organisationen die Schwelle von 20 Mitgliedern (angeführt von den Vereinten Nationen mit 97 Mitgliedern).',
  },
  {
    id: 'terra-15-wuesten-australien',
    schemaId: 'terra',
    title: 'Wüsten in Australien (4-Wege-JOIN)',
    source: 'Übungsblatt 6 · Aufg. 5(b)',
    difficulty: 'Basis',
    topics: ['JOIN', 'DISTINCT'],
    prompt:
      'Bestimmen Sie die Namen aller Wüsten (ohne Duplikate), die im Land `\'Australien\'` liegen.',
    expectedColumns: ['Name'],
    orderMatters: false,
    requiresDistinct: true,
    solutionSql: `SELECT DISTINCT w.Name
FROM Wueste w
JOIN geo_Wueste gw ON w.W_ID = gw.W_ID
JOIN Landesteil lt ON gw.LT_ID = lt.LT_ID
JOIN Land l ON lt.L_ID = l.L_ID
WHERE l.Name = 'Australien';`,
    hints: [
      'Verbinden Sie `Wueste` → `geo_Wueste` → `Landesteil` → `Land` und filtern Sie auf `l.Name = \'Australien\'`.',
      'Nutzen Sie `SELECT DISTINCT`, da eine Wüste an mehrere Landesteile eines Landes grenzen kann.',
    ],
    solutionExplanation:
      'Liefert die 5 australischen Wüsten: Gibsonwueste, Grosse Sandwueste, Grosse Victoriawueste, Nullarbor-Wueste und Simpsonwueste.',
  },
  {
    id: 'terra-16-noerdlichste-stadt',
    schemaId: 'terra',
    title: 'Nördlichste Stadt der Datenbank (MAX)',
    source: 'Übungsblatt 6 · Aufg. 5(c)',
    difficulty: 'Basis',
    topics: ['Unterabfrage', 'MAX'],
    prompt:
      'Welche ist die nördlichste Stadt? Geben Sie den Namen der Stadt aus, die die größte geographische `Breite` hat.',
    expectedColumns: ['Name'],
    orderMatters: false,
    solutionSql: `SELECT s.Name
FROM Stadt s
WHERE s.Breite = (SELECT MAX(Breite) FROM Stadt);`,
    alternativeSolutions: [
      `SELECT Name FROM Stadt WHERE Breite >= ALL (SELECT Breite FROM Stadt WHERE Breite IS NOT NULL);`,
    ],
    hints: [
      'Vergleichen Sie `s.Breite` mit `(SELECT MAX(Breite) FROM Stadt)` statt `ORDER BY ... LIMIT 1` zu raten (so werden Gleichstände korrekt behandelt).',
    ],
    solutionExplanation:
      'Vadsoe (Norwegen, 70° Nord) hat in der TerraDB die größte geographische Breite.',
  },
  {
    id: 'terra-17-wuestenanteil-kontinent',
    schemaId: 'terra',
    title: 'Wüstenflächen-Anteil je Kontinent (Einheiten-Falle!)',
    source: 'Übungsblatt 6 · Aufg. 5(d)',
    difficulty: 'Klausurniveau',
    topics: ['WITH / CTE', 'SUM', 'DISTINCT', 'Gleitkomma-Division'],
    prompt:
      'Bestimmen Sie für jeden Kontinent (mit mindestens einer flächenmäßig erfassten Wüste) den Flächenanteil von Wüsten an der Kontinentfläche. Geben Sie `Name` des Kontinents und `Anteil` (in dieser Reihenfolge) absteigend sortiert nach `Anteil` aus. Hinweis: Gehen Sie davon aus, dass Länder/Wüsten vollständig zu Kontinenten gehören (`umfasst.Prozent` ignorieren), aber achten Sie auf die Einheiten (`Kontinent.Flaeche` in Mio. km², `Wueste.Flaeche` in km²) und vermeiden Sie Mehrfachzählung über Landesteile!',
    expectedColumns: ['Name', 'Anteil'],
    orderMatters: true,
    solutionSql: `WITH
Wueste2Kontinent AS (
  SELECT DISTINCT gw.W_ID, u.K_ID
  FROM umfasst u
  JOIN Landesteil lt ON u.L_ID = lt.L_ID
  JOIN geo_Wueste gw ON gw.LT_ID = lt.LT_ID
),
Kontinent2Wuestenflaeche(K_ID, Flaeche) AS (
  SELECT wk.K_ID, SUM(w.Flaeche)
  FROM Wueste w
  JOIN Wueste2Kontinent wk ON wk.W_ID = w.W_ID
  GROUP BY wk.K_ID
  HAVING SUM(w.Flaeche) > 0
)
SELECT k.Name, w.Flaeche / (k.Flaeche * 1000000.0) AS Anteil
FROM Kontinent k
JOIN Kontinent2Wuestenflaeche w ON w.K_ID = k.K_ID
WHERE k.Flaeche > 0
ORDER BY Anteil DESC;`,
    hints: [
      'Deduplizieren Sie zunächst `(W_ID, K_ID)` in einer CTE, damit eine Wüste, die in mehreren Landesteilen liegt, nicht doppelt summiert wird.',
      'Rechnen Sie `k.Flaeche * 1000000.0` (mit `.0`, um Integer-Division in SQL zu verhindern!). Kontinente ohne bekannte Wüstenfläche (HAVING `SUM(w.Flaeche) > 0`) fallen heraus.',
    ],
    solutionExplanation:
      'Genau die Einheiten- und Float-Divisions-Falle aus Blatt 6 Lsg.: Europa (~6,07 %) liegt vor Afrika (~3,60 %), Asien (~1,99 %) und Amerika (~0,25 %).',
  },
  {
    id: 'terra-18-hauptstaedte-org-verhaeltnis',
    schemaId: 'terra',
    title: 'Hauptstädte: Mitgliedschaften <= 2 * Sitz-Organisationen',
    source: 'Übungsblatt 6 · Aufg. 5(h)',
    difficulty: 'Klausurniveau',
    topics: ['WITH / CTE', 'GROUP BY', 'COUNT'],
    prompt:
      'Geben Sie die Namen aller Hauptstädte (die Sitz mindestens einer Organisation sind) an, deren zugehöriges Land höchstens in zweimal so vielen Organisationen Mitglied ist, wie die Hauptstadt Sitz einer Organisation ist (`locount <= 2 * socount`).',
    expectedColumns: ['Name'],
    orderMatters: false,
    requiresDistinct: true,
    solutionSql: `WITH
StadtOrganisation AS (
  SELECT s.S_ID, COUNT(o.O_ID) AS socount
  FROM Stadt s
  JOIN hat_Sitz_in hsi ON s.S_ID = hsi.S_ID
  JOIN Organisation o ON hsi.O_ID = o.O_ID
  JOIN Land l ON l.Hauptstadt = s.S_ID
  GROUP BY s.S_ID
),
LandMitglied AS (
  SELECT l.L_ID, COUNT(o.O_ID) AS locount
  FROM Land l
  JOIN ist_Mitglied m ON l.L_ID = m.L_ID
  JOIN Organisation o ON m.O_ID = o.O_ID
  GROUP BY l.L_ID
)
SELECT s.Name
FROM LandMitglied lm
JOIN Land l ON lm.L_ID = l.L_ID
JOIN StadtOrganisation so ON l.Hauptstadt = so.S_ID
JOIN Stadt s ON s.S_ID = so.S_ID
WHERE lm.locount <= 2 * so.socount;`,
    hints: [
      'Berechnen Sie in zwei CTEs getrennt: (1) `socount` = Anzahl Organisationen mit Sitz in der Hauptstadt und (2) `locount` = Anzahl Organisationen, in denen das Land Mitglied ist.',
      'Verbinden Sie beide CTEs über `Land.Hauptstadt = Stadt.S_ID` und prüfen Sie `locount <= 2 * socount`.',
    ],
    solutionExplanation:
      'Im Original-Datensatz erfüllen genau zwei Hauptstädte die Bedingung: Addis Abeba (Äthiopien) und London (Großbritannien).',
  },
  {
    id: 'terra-19-top5-wuesten',
    schemaId: 'terra',
    title: 'Top-5 der größten Wüsten mit Rang',
    source: 'Übungsblatt 6 · Aufg. 5(i)',
    difficulty: 'Mittel',
    topics: ['Window Function', 'RANK() OVER', 'NULL-Filter'],
    prompt:
      'Erstellen Sie eine Liste der fünf größten Wüsten (kleinster Rang = 1 für die größte Fläche). Geben Sie nur `Name` und `Rang` (in dieser Reihenfolge, ohne Fläche) aufsteigend sortiert nach `Rang` aus. Wüsten ohne Flächenangabe sollen ausgeschlossen werden.',
    expectedColumns: ['Name', 'Rang'],
    orderMatters: true,
    solutionSql: `SELECT t.Name, t.Rang
FROM (
  SELECT Name, RANK() OVER (ORDER BY Flaeche DESC) AS Rang
  FROM Wueste
  WHERE Flaeche > 0
) AS t
WHERE t.Rang <= 5
ORDER BY t.Rang ASC;`,
    alternativeSolutions: [
      `SELECT w1.Name, COUNT(*) AS Rang
FROM Wueste w1
JOIN Wueste w2 ON (w1.Flaeche < w2.Flaeche OR w1.W_ID = w2.W_ID)
WHERE w1.Flaeche > 0
  AND w2.Flaeche > 0
GROUP BY w1.W_ID, w1.Name
HAVING COUNT(*) <= 5
ORDER BY Rang ASC;`,
    ],
    hints: [
      'Achten Sie darauf, `Flaeche IS NOT NULL` (bzw. `Flaeche > 0`) zu filtern — sonst landet `Sinai-Wueste` (`NULL`) bei `ORDER BY Flaeche DESC` in PostgreSQL ganz oben (`NULLS FIRST`)!',
      'Berechnen Sie `RANK() OVER (ORDER BY Flaeche DESC)` in einer Unterabfrage und filtern Sie außen auf `Rang <= 5` (oder nutzen Sie den Self-Join mit `COUNT(*)` aus der Blatt-6-Lösung).',
    ],
    solutionExplanation:
      'WICHTIGE PostgreSQL-Falle: Bei `ORDER BY Flaeche DESC` stehen `NULL`-Werte standardmäßig ZUERST! Erst `WHERE Flaeche IS NOT NULL` (oder `> 0`) liefert die Top 5 (Kysylkum & Karakum geteilt auf Rang 1, danach Libysche Wueste, Taklamakan, Rub al-Chali).',
  },
];
