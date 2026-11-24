import type { Exercise, SchemaDef } from '../../types/sql';

export const terraSchema: SchemaDef = {
  id: 'terra',
  title: 'Terra-Datenbank (Geographie-DB)',
  shortTitle: 'Terra-DB',
  sheets: 'Übungsblatt 5 (Aufg. 5) · Übungsblatt 6 (Aufg. 1 & 5)',
  summary:
    'Das große SQL-Übungsschema aus Blatt 5 und Blatt 6 mit Ländern, Kontinenten, Landesteilen, Städten, Bergen, Wüsten, Inseln, Gewässern (Generalisierung See/Fluss/Meer) und internationalen Organisationen.',
  explanationBullets: [
    'Tabellen mit Substantiv-Namen modellieren geographische Objekte (z. B. Land, Landesteil, Stadt, Berg, Wueste, Insel, Organisation).',
    'Schlüssel und Fremdschlüssel enden auf _ID und beginnen mit dem Tabellenkürzel: L_ID (Land), LT_ID (Landesteil), K_ID (Kontinent), S_ID (Stadt), B_ID (Berg), W_ID (Wueste), I_ID (Insel), G_ID (Gewaesser), O_ID (Organisation).',
    'Ein Land besteht aus einem oder mehreren Landesteilen (Landesteil.L_ID → Land.L_ID) und hat eine Hauptstadt (Land.Hauptstadt → Stadt.S_ID).',
    'Gewaesser modelliert den Obertyp (G_ID, Name) der Generalisierung mit den Untertypen See (Tiefe), Fluss (Laenge) und Meer (Tiefe).',
    'Die Tabellen geo_Berg, geo_Wueste, geo_Insel und geo_Gewaesser ordnen geographische Objekte einem oder mehreren Landesteilen (LT_ID) zu.',
    'benachbart(L_ID1, L_ID2) speichert gemeinsame Landesgrenzen, muendet(G_ID, Muendung_G_ID) Flussmündungen, gehoert_LT(S_ID, LT_ID) ordnet Städte Landesteilen zu, liegt_an(S_ID, G_ID) Städte Gewässern.',
    'Organisationen haben ihren Sitz in einer Stadt (hat_Sitz_in(O_ID, S_ID)); Länder sind Mitglied über ist_Mitglied(O_ID, L_ID); umfasst(K_ID, L_ID, Prozent) ordnet Länder Kontinenten zu.',
  ],
  examNotes: [
    'KRITISCHE FALLE 1: Die Tabelle benachbart ist NICHT symmetrisch! Steht (\'DE\', \'FR\') darin, fehlt (\'FR\', \'DE\') — Sie müssen immer beide Richtungen prüfen (OR oder symmetrisches UNION)!',
    'KRITISCHE FALLE 2: Kontinent.Flaeche ist in Millionen km² gespeichert, Wueste.Flaeche aber in km²! Bei Quotienten zusätzlich auf Fließkomma-Division (z. B. * 1000000.0) achten.',
    'PostgreSQL unterstützt (anders als SQLite) auch > ALL (...) und = ANY (...) sowie WITH RECURSIVE und RANK() OVER (...).',
  ],
  tables: [
    {
      name: 'Kontinent',
      description: 'Kontinente (Flaeche in Mio. km²!)',
      columns: [
        { name: 'K_ID', type: 'VARCHAR(10)', isPk: true },
        { name: 'Name', type: 'VARCHAR(50)' },
        { name: 'Flaeche', type: 'NUMERIC(10,2)', note: 'in 1.000.000 km²' },
      ],
    },
    {
      name: 'Land',
      description: 'Staaten mit Fläche (km²) und Verweis auf Hauptstadt',
      columns: [
        { name: 'L_ID', type: 'VARCHAR(10)', isPk: true },
        { name: 'Name', type: 'VARCHAR(80)' },
        { name: 'Flaeche', type: 'NUMERIC(12,2)', note: 'in km²' },
        { name: 'Hauptstadt', type: 'INTEGER', fkTarget: 'Stadt.S_ID' },
      ],
    },
    {
      name: 'umfasst',
      description: 'Zuordnung Land ↔ Kontinent (mit Flächenanteil)',
      columns: [
        { name: 'K_ID', type: 'VARCHAR(10)', isPk: true, fkTarget: 'Kontinent.K_ID' },
        { name: 'L_ID', type: 'VARCHAR(10)', isPk: true, fkTarget: 'Land.L_ID' },
        { name: 'Prozent', type: 'INTEGER' },
      ],
    },
    {
      name: 'Landesteil',
      description: 'Bundesländer, Provinzen oder Regionen eines Landes',
      columns: [
        { name: 'LT_ID', type: 'INTEGER', isPk: true },
        { name: 'Name', type: 'VARCHAR(80)' },
        { name: 'L_ID', type: 'VARCHAR(10)', fkTarget: 'Land.L_ID' },
      ],
    },
    {
      name: 'Stadt',
      description: 'Städte mit geographischer Breite und Einwohnerzahl (kann NULL sein)',
      columns: [
        { name: 'S_ID', type: 'INTEGER', isPk: true },
        { name: 'Name', type: 'VARCHAR(80)' },
        { name: 'Breite', type: 'NUMERIC(6,2)', note: 'Nord positiv, Süd negativ' },
        { name: 'Einwohner', type: 'INTEGER', note: 'NULL möglich' },
      ],
    },
    {
      name: 'gehoert_LT',
      description: 'Zuordnung Stadt → Landesteil',
      columns: [
        { name: 'S_ID', type: 'INTEGER', isPk: true, fkTarget: 'Stadt.S_ID' },
        { name: 'LT_ID', type: 'INTEGER', isPk: true, fkTarget: 'Landesteil.LT_ID' },
      ],
    },
    {
      name: 'Berg / geo_Berg',
      description: 'Berge (B_ID, Name, Hoehe) und Zuordnung zu Landesteilen (B_ID, LT_ID)',
      columns: [
        { name: 'B_ID', type: 'INTEGER', isPk: true },
        { name: 'Name', type: 'VARCHAR(80)' },
        { name: 'Hoehe', type: 'INTEGER', note: 'in Metern' },
      ],
    },
    {
      name: 'Wueste / geo_Wueste',
      description: 'Wüsten (W_ID, Name, Flaeche in km²; NULL möglich) & Zuordnung (W_ID, LT_ID)',
      columns: [
        { name: 'W_ID', type: 'INTEGER', isPk: true },
        { name: 'Name', type: 'VARCHAR(80)' },
        { name: 'Flaeche', type: 'INTEGER', note: 'in km² (NULL möglich)' },
      ],
    },
    {
      name: 'Insel / geo_Insel',
      description: 'Inseln (I_ID, Name, Flaeche) und Zuordnung zu Landesteilen (I_ID, LT_ID)',
      columns: [
        { name: 'I_ID', type: 'INTEGER', isPk: true },
        { name: 'Name', type: 'VARCHAR(80)' },
        { name: 'Flaeche', type: 'INTEGER' },
      ],
    },
    {
      name: 'Gewaesser / See / Fluss / Meer',
      description: 'Generalisierung Gewässer (G_ID, Name) + Untertypen + geo_Gewaesser, liegt_an, muendet, geht_ueber',
      columns: [
        { name: 'G_ID', type: 'INTEGER', isPk: true },
        { name: 'Name', type: 'VARCHAR(80)' },
        { name: 'Tiefe / Laenge', type: 'INTEGER', note: 'See.Tiefe, Meer.Tiefe, Fluss.Laenge' },
      ],
    },
    {
      name: 'benachbart',
      description: 'Landesgrenzen zwischen zwei Ländern (NICHT symmetrisch!)',
      columns: [
        { name: 'L_ID1', type: 'VARCHAR(10)', isPk: true, fkTarget: 'Land.L_ID' },
        { name: 'L_ID2', type: 'VARCHAR(10)', isPk: true, fkTarget: 'Land.L_ID' },
      ],
    },
    {
      name: 'Organisation / hat_Sitz_in / ist_Mitglied',
      description: 'Organisationen (O_ID, Name), Sitzstadt (O_ID, S_ID) und Mitgliedsländer (O_ID, L_ID)',
      columns: [
        { name: 'O_ID', type: 'VARCHAR(15)', isPk: true },
        { name: 'Name', type: 'VARCHAR(100)' },
      ],
    },
  ],
  seedSql: `
    CREATE TABLE Kontinent (
      K_ID VARCHAR(10) PRIMARY KEY,
      Name VARCHAR(50) NOT NULL,
      Flaeche NUMERIC(10,2) NOT NULL
    );

    CREATE TABLE Stadt (
      S_ID INTEGER PRIMARY KEY,
      Name VARCHAR(80) NOT NULL,
      Breite NUMERIC(6,2) NOT NULL,
      Einwohner INTEGER
    );

    CREATE TABLE Land (
      L_ID VARCHAR(10) PRIMARY KEY,
      Name VARCHAR(80) NOT NULL,
      Flaeche NUMERIC(12,2) NOT NULL,
      Hauptstadt INTEGER REFERENCES Stadt(S_ID)
    );

    CREATE TABLE umfasst (
      K_ID VARCHAR(10) REFERENCES Kontinent(K_ID),
      L_ID VARCHAR(10) REFERENCES Land(L_ID),
      Prozent INTEGER NOT NULL,
      PRIMARY KEY (K_ID, L_ID)
    );

    CREATE TABLE Landesteil (
      LT_ID INTEGER PRIMARY KEY,
      Name VARCHAR(80) NOT NULL,
      L_ID VARCHAR(10) NOT NULL REFERENCES Land(L_ID)
    );

    CREATE TABLE gehoert_LT (
      S_ID INTEGER REFERENCES Stadt(S_ID),
      LT_ID INTEGER REFERENCES Landesteil(LT_ID),
      PRIMARY KEY (S_ID, LT_ID)
    );

    CREATE TABLE Berg (
      B_ID INTEGER PRIMARY KEY,
      Name VARCHAR(80) NOT NULL,
      Hoehe INTEGER NOT NULL
    );

    CREATE TABLE geo_Berg (
      B_ID INTEGER REFERENCES Berg(B_ID),
      LT_ID INTEGER REFERENCES Landesteil(LT_ID),
      PRIMARY KEY (B_ID, LT_ID)
    );

    CREATE TABLE Wueste (
      W_ID INTEGER PRIMARY KEY,
      Name VARCHAR(80) NOT NULL,
      Flaeche INTEGER
    );

    CREATE TABLE geo_Wueste (
      W_ID INTEGER REFERENCES Wueste(W_ID),
      LT_ID INTEGER REFERENCES Landesteil(LT_ID),
      PRIMARY KEY (W_ID, LT_ID)
    );

    CREATE TABLE Insel (
      I_ID INTEGER PRIMARY KEY,
      Name VARCHAR(80) NOT NULL,
      Flaeche INTEGER NOT NULL
    );

    CREATE TABLE geo_Insel (
      I_ID INTEGER REFERENCES Insel(I_ID),
      LT_ID INTEGER REFERENCES Landesteil(LT_ID),
      PRIMARY KEY (I_ID, LT_ID)
    );

    CREATE TABLE Gewaesser (
      G_ID INTEGER PRIMARY KEY,
      Name VARCHAR(80) NOT NULL
    );

    CREATE TABLE See (
      G_ID INTEGER PRIMARY KEY REFERENCES Gewaesser(G_ID),
      Tiefe INTEGER NOT NULL
    );

    CREATE TABLE Fluss (
      G_ID INTEGER PRIMARY KEY REFERENCES Gewaesser(G_ID),
      Laenge INTEGER NOT NULL
    );

    CREATE TABLE Meer (
      G_ID INTEGER PRIMARY KEY REFERENCES Gewaesser(G_ID),
      Tiefe INTEGER NOT NULL
    );

    CREATE TABLE geo_Gewaesser (
      G_ID INTEGER REFERENCES Gewaesser(G_ID),
      LT_ID INTEGER REFERENCES Landesteil(LT_ID),
      PRIMARY KEY (G_ID, LT_ID)
    );

    CREATE TABLE liegt_an (
      S_ID INTEGER REFERENCES Stadt(S_ID),
      G_ID INTEGER REFERENCES Gewaesser(G_ID),
      PRIMARY KEY (S_ID, G_ID)
    );

    CREATE TABLE muendet (
      G_ID INTEGER REFERENCES Fluss(G_ID),
      Muendung_G_ID INTEGER REFERENCES Gewaesser(G_ID),
      PRIMARY KEY (G_ID, Muendung_G_ID)
    );

    CREATE TABLE geht_ueber (
      G_ID1 INTEGER REFERENCES Meer(G_ID),
      G_ID2 INTEGER REFERENCES Meer(G_ID),
      PRIMARY KEY (G_ID1, G_ID2)
    );

    CREATE TABLE benachbart (
      L_ID1 VARCHAR(10) REFERENCES Land(L_ID),
      L_ID2 VARCHAR(10) REFERENCES Land(L_ID),
      PRIMARY KEY (L_ID1, L_ID2)
    );

    CREATE TABLE Organisation (
      O_ID VARCHAR(15) PRIMARY KEY,
      Name VARCHAR(100) NOT NULL
    );

    CREATE TABLE hat_Sitz_in (
      O_ID VARCHAR(15) REFERENCES Organisation(O_ID),
      S_ID INTEGER REFERENCES Stadt(S_ID),
      PRIMARY KEY (O_ID, S_ID)
    );

    CREATE TABLE ist_Mitglied (
      O_ID VARCHAR(15) REFERENCES Organisation(O_ID),
      L_ID VARCHAR(10) REFERENCES Land(L_ID),
      PRIMARY KEY (O_ID, L_ID)
    );

    -- Kontinente (Flaeche in Mio. km^2)
    INSERT INTO Kontinent VALUES
      ('EU', 'Europa', 10.50),
      ('AS', 'Asien', 44.60),
      ('AF', 'Afrika', 30.20),
      ('NA', 'Nordamerika', 24.70),
      ('SA', 'Südamerika', 17.80),
      ('AU', 'Australien/Ozeanien', 8.50);

    -- Staedte
    INSERT INTO Stadt VALUES
      (1,  'Berlin',          52.52,  3670000),
      (2,  'Mannheim',        49.49,   315000),
      (3,  'Paris',           48.86,  2160000),
      (4,  'Wien',            48.21,  1930000),
      (5,  'Bern',            46.95,   134000),
      (6,  'Genf',            46.20,   203000),
      (7,  'Warschau',        52.23,  1790000),
      (8,  'Rom',             41.90,  2870000),
      (9,  'Madrid',          40.42,  3220000),
      (10, 'Brüssel',         50.85,  1220000),
      (11, 'Reykjavik',       64.15,   135000),
      (12, 'Washington',      38.91,   690000),
      (13, 'New York',        40.71,  8400000),
      (14, 'Ottawa',          45.42,  1010000),
      (15, 'Mexiko-Stadt',    19.43,  9200000),
      (16, 'Canberra',       -35.28,   430000),
      (17, 'Perth',          -31.95,  2100000),
      (18, 'Peking',          39.90, 21500000),
      (19, 'Shanghai',        31.23, 24800000),
      (20, 'Tokio',           35.68, 37400000),
      (21, 'Kairo',           30.04, 10200000),
      (22, 'Longyearbyen',    78.22,     NULL),
      (23, 'Oslo',            59.91,   700000),
      (24, 'Delhi',           28.61, 31000000),
      (25, 'Neu-Delhi',       28.61,   250000),
      (26, 'Brasília',       -15.79,  3050000),
      (27, 'Buenos Aires',   -34.60,  3075000),
      (28, 'Santiago',       -33.45,  6250000),
      (29, 'Lima',           -12.05,  9750000);

    -- Laender (Flaeche in km^2)
    INSERT INTO Land VALUES
      ('DE', 'Bundesrepublik Deutschland', 357588,  1),
      ('FR', 'Frankreich',                 551695,  3),
      ('AT', 'Österreich',                  83879,  4),
      ('CH', 'Schweiz',                     41285,  5),
      ('PL', 'Polen',                      312696,  7),
      ('IT', 'Italien',                    301340,  8),
      ('ES', 'Spanien',                    505990,  9),
      ('BE', 'Belgien',                     30528, 10),
      ('IS', 'Island',                     103000, 11),
      ('NO', 'Norwegen',                   385207, 23),
      ('US', 'USA',                       9833517, 12),
      ('CA', 'Kanada',                    9984670, 14),
      ('MX', 'Mexiko',                    1964375, 15),
      ('AU', 'Australien',                7692024, 16),
      ('CN', 'Volksrepublik China',       9596961, 18),
      ('JP', 'Japan',                      377975, 20),
      ('EG', 'Ägypten',                   1002450, 21),
      ('IN', 'Indien',                    3287263, 25),
      ('BR', 'Brasilien',                 8515767, 26),
      ('AR', 'Argentinien',               2780400, 27),
      ('CL', 'Chile',                      756102, 28),
      ('PE', 'Peru',                      1285216, 29);

    INSERT INTO umfasst VALUES
      ('EU', 'DE', 100), ('EU', 'FR', 100), ('EU', 'AT', 100),
      ('EU', 'CH', 100), ('EU', 'PL', 100), ('EU', 'IT', 100),
      ('EU', 'ES', 100), ('EU', 'BE', 100), ('EU', 'IS', 100),
      ('EU', 'NO', 100),
      ('NA', 'US', 100), ('NA', 'CA', 100), ('NA', 'MX', 100),
      ('SA', 'BR', 100), ('SA', 'AR', 100), ('SA', 'CL', 100), ('SA', 'PE', 100),
      ('AU', 'AU', 100),
      ('AS', 'CN', 100), ('AS', 'JP', 100), ('AS', 'IN', 100),
      ('AF', 'EG', 100);

    -- Landesteile
    INSERT INTO Landesteil VALUES
      (101, 'Berlin',             'DE'),
      (102, 'Baden-Württemberg',  'DE'),
      (103, 'Bayern',             'DE'),
      (104, 'Ile-de-France',      'FR'),
      (105, 'Auvergne-Rhône',     'FR'),
      (106, 'Wien',               'AT'),
      (107, 'Tirol',              'AT'),
      (108, 'Bern',               'CH'),
      (109, 'Genf',               'CH'),
      (110, 'Wallis',             'CH'),
      (111, 'Masowien',           'PL'),
      (112, 'Latium',             'IT'),
      (113, 'Madrid',             'ES'),
      (114, 'Brüssel',            'BE'),
      (115, 'Hauptstadtregion',   'IS'),
      (116, 'Svalbard',           'NO'),
      (117, 'Oslo',               'NO'),
      (118, 'District of Columbia','US'),
      (119, 'New York',           'US'),
      (120, 'Kalifornien',        'US'),
      (121, 'Ontario',            'CA'),
      (122, 'Mexiko-Stadt',       'MX'),
      (123, 'Western Australia',  'AU'),
      (124, 'ACT',                'AU'),
      (125, 'Northern Territory', 'AU'),
      (126, 'Peking',             'CN'),
      (127, 'Shanghai',           'CN'),
      (128, 'Xinjiang',           'CN'),
      (129, 'Kanto',              'JP'),
      (130, 'Hokkaido',           'JP'),
      (131, 'Kyushu',             'JP'),
      (132, 'Kairo',              'EG'),
      (133, 'Sinai',              'EG'),
      (134, 'Delhi',              'IN'),
      (135, 'Distrito Federal',   'BR'),
      (136, 'Buenos Aires',       'AR'),
      (137, 'Metropolitana',      'CL'),
      (138, 'Lima',               'PE');

    INSERT INTO gehoert_LT VALUES
      (1, 101), (2, 102), (3, 104), (4, 106), (5, 108), (6, 109),
      (7, 111), (8, 112), (9, 113), (10, 114), (11, 115),
      (12, 118), (13, 119), (14, 121), (15, 122),
      (16, 124), (17, 123), (18, 126), (19, 127),
      (20, 129), (21, 132), (22, 116), (23, 117), (24, 134), (25, 134),
      (26, 135), (27, 136), (28, 137), (29, 138);

    -- Berge
    INSERT INTO Berg VALUES
      (1, 'Zugspitze',     2962),
      (2, 'Feldberg',      1493),
      (3, 'Mont Blanc',    4808),
      (4, 'Großglockner',  3798),
      (5, 'Matterhorn',    4478),
      (6, 'Dufourspitze',  4634),
      (7, 'Mount Whitney', 4421),
      (8, 'Mount Fuji',    3776),
      (9, 'Mount Everest', 8848);

    INSERT INTO geo_Berg VALUES
      (1, 103), (2, 102), (3, 105), (4, 107), (5, 110),
      (6, 110), (7, 120), (8, 129), (9, 128);

    -- Wuesten (Flaeche in km^2)
    INSERT INTO Wueste VALUES
      (1, 'Sahara',                9200000),
      (2, 'Grosse Victoriawueste',  424400),
      (3, 'Grosse Sandwueste',      360000),
      (4, 'Simpsonwueste',          176500),
      (5, 'Taklamakan',             337000),
      (6, 'Mojave-Wueste',          124000),
      (7, 'Sinai-Wueste',             NULL);

    INSERT INTO geo_Wueste VALUES
      (1, 132), (2, 123), (3, 123), (4, 125),
      (5, 128), (6, 120), (7, 133);

    -- Inseln
    INSERT INTO Insel VALUES
      (1, 'Honshu',         227960),
      (2, 'Hokkaido',        83424),
      (3, 'Kyushu',          36782),
      (4, 'Island',         103000),
      (5, 'Rottnest Island',    19),
      (6, 'Catalina Island',   194),
      (7, 'Spitzbergen',     37673);

    INSERT INTO geo_Insel VALUES
      (1, 129), (2, 130), (3, 131), (4, 115),
      (5, 123), (6, 120), (7, 116);

    -- Gewaesser (Obertyp + Untertypen)
    INSERT INTO Gewaesser VALUES
      (1,  'Rhein'),
      (2,  'Donau'),
      (3,  'Spree'),
      (4,  'Seine'),
      (5,  'Nil'),
      (6,  'Potomac'),
      (7,  'Bodensee'),
      (8,  'Baikalsee'),
      (9,  'Tanganjikasee'),
      (10, 'Nordsee'),
      (11, 'Ostsee'),
      (12, 'Mittelmeer'),
      (13, 'Pazifik'),
      (14, 'Indischer Ozean');

    INSERT INTO Fluss VALUES
      (1, 1233), (2, 2857), (3, 400), (4, 777), (5, 6650), (6, 652);

    INSERT INTO See VALUES
      (7, 251), (8, 1642), (9, 1470);

    INSERT INTO Meer VALUES
      (10, 95), (11, 55), (12, 5267), (13, 10911), (14, 7258);

    INSERT INTO geo_Gewaesser VALUES
      (1, 102), (2, 103), (2, 106), (3, 101), (4, 104),
      (5, 132), (7, 102), (13, 120), (14, 123), (10, 117);

    INSERT INTO liegt_an VALUES
      (1, 3),  -- Berlin an Spree (Fluss)
      (2, 1),  -- Mannheim an Rhein (Fluss)
      (3, 4),  -- Paris an Seine (Fluss)
      (4, 2),  -- Wien an Donau (Fluss)
      (12, 6), -- Washington an Potomac (Fluss)
      (21, 5), -- Kairo an Nil (Fluss)
      (20, 13),-- Tokio am Pazifik (Meer, kein Fluss!)
      (23, 10);-- Oslo an Nordsee (Meer)

    INSERT INTO muendet VALUES
      (1, 10), (4, 10), (5, 12);

    INSERT INTO geht_ueber VALUES
      (10, 11), (12, 14);

    -- benachbart: ABSICHTLICH NICHT SYMMETRISCH (wie im Original-TerraDB!)
    INSERT INTO benachbart VALUES
      ('DE', 'FR'),
      ('DE', 'AT'),
      ('DE', 'CH'),
      ('PL', 'DE'),
      ('BE', 'DE'),
      ('FR', 'ES'),
      ('FR', 'IT'),
      ('FR', 'BE'),
      ('FR', 'CH'),
      ('AT', 'IT'),
      ('AT', 'CH'),
      ('CA', 'US'),
      ('US', 'MX'),
      ('CN', 'IN'),
      ('BR', 'AR'),
      ('AR', 'CL'),
      ('CL', 'PE');

    -- Organisationen
    INSERT INTO Organisation VALUES
      ('UN',   'Vereinte Nationen'),
      ('EU',   'Europäische Union'),
      ('NATO', 'NATO'),
      ('WHO',  'Weltgesundheitsorganisation'),
      ('G7',   'Gruppe der Sieben'),
      ('SOLO', 'Virtuelle Allianz ohne Sitz');

    INSERT INTO hat_Sitz_in VALUES
      ('UN',   13), -- New York (USA)
      ('EU',   10), -- Brüssel (Belgien)
      ('NATO', 10), -- Brüssel (Belgien)
      ('WHO',   6), -- Genf (Schweiz)
      ('G7',    1); -- Berlin (DE)

    INSERT INTO ist_Mitglied VALUES
      ('UN', 'DE'), ('UN', 'FR'), ('UN', 'AT'), ('UN', 'CH'), ('UN', 'PL'),
      ('UN', 'IT'), ('UN', 'ES'), ('UN', 'BE'), ('UN', 'IS'), ('UN', 'NO'),
      ('UN', 'US'), ('UN', 'CA'), ('UN', 'MX'), ('UN', 'AU'), ('UN', 'CN'),
      ('UN', 'JP'), ('UN', 'EG'), ('UN', 'IN'), ('UN', 'BR'), ('UN', 'AR'),
      ('UN', 'CL'), ('UN', 'PE'),
      ('EU', 'DE'), ('EU', 'FR'), ('EU', 'AT'), ('EU', 'PL'), ('EU', 'IT'),
      ('EU', 'ES'), ('EU', 'BE'),
      ('NATO', 'DE'), ('NATO', 'FR'), ('NATO', 'PL'), ('NATO', 'IT'),
      ('NATO', 'ES'), ('NATO', 'BE'), ('NATO', 'IS'), ('NATO', 'NO'),
      ('NATO', 'US'), ('NATO', 'CA'),
      ('WHO', 'DE'), ('WHO', 'FR'), ('WHO', 'CH'), ('WHO', 'US'), ('WHO', 'JP'),
      ('WHO', 'AT'), ('WHO', 'PL'), ('WHO', 'IT'), ('WHO', 'ES'), ('WHO', 'IS'),
      ('WHO', 'NO'), ('WHO', 'CA'), ('WHO', 'MX'), ('WHO', 'AU'), ('WHO', 'CN'),
      ('WHO', 'EG'), ('WHO', 'IN'), ('WHO', 'BR'), ('WHO', 'AR'), ('WHO', 'CL'),
      ('WHO', 'PE'),
      ('G7', 'DE'), ('G7', 'FR'), ('G7', 'IT'), ('G7', 'US'), ('G7', 'CA'), ('G7', 'JP');
  `,
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
      'Zeigt den Umgang mit Generalisierung im relationalen Schema: Join über G_ID zwischen Fluss (Untertyp) und Gewaesser (Obertyp). Tokio (Pazifik) und Oslo (Nordsee) werden ausgeschlossen.',
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
    solutionExplanation: 'USA, Australien, China und Ägypten haben Wüsten und fallen heraus; alle anderen Länder bleiben übrig.',
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
      'Australien (1 Insel), Island (1 Insel) und Japan (3 Inseln) grenzen an kein anderes Land (auch Norwegen hat im Datensatz keine Nachbarn, besitzt Spitzbergen als Insel → 4 Ergebnisse!).',
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
      'RANK() OVER (ORDER BY l.Flaeche DESC) erzeugt direkt die Rangliste mit Frankreich (1), Spanien (2), Norwegen (3), Deutschland (4) usw.',
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
    solutionExplanation: 'LIKE \'%Gross%\' matcht Grosse Victoriawueste und Grosse Sandwueste (absteigend sortiert).',
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
      'Nordsee (95 m) und Ostsee (55 m) sind unter 200 m tief; alle drei Seen (Bodensee 251 m, Tanganjikasee 1470 m, Baikalsee 1642 m) sind tiefer.',
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
      'Shanghai (24,8 Mio.) ist die größte chinesische Stadt im Datensatz. Nur Tokio (37,4 Mio.) und Delhi (31,0 Mio.) haben mehr Einwohner.',
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
      'Sowohl Kalifornien (Mojave, Catalina Island, Pazifik) als auch Western Australia (Victoria-/Sandwüste, Rottnest Island, Indischer Ozean) erfüllen alle drei Bedingungen.',
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
      'Genau wie auf Blatt 6 Aufg. 1: Durch UNION statt UNION ALL terminiert die Rekursion trotz Zyklen (z. B. DE–FR–CH–DE) garantiert. Von Deutschland sind Belgien, Frankreich, Italien, Österreich, Polen, Schweiz und Spanien auf dem Landweg erreichbar.',
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
      'Mit den Daten der Terra-Datenbank überschreiten die Vereinten Nationen (22 Mitglieder) und die Weltgesundheitsorganisation (21 Mitglieder) die Schwelle von 20 Mitgliedern.',
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
      'Liefert die drei australischen Wüsten: Grosse Victoriawueste, Grosse Sandwueste und Simpsonwueste.',
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
      'Longyearbyen auf Spitzbergen liegt bei 78,22° Nord und hat damit die größte Breite im Datensatz (trotz `Einwohner = NULL`).',
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
      'Genau die Einheiten- und Float-Divisions-Falle aus Blatt 6 Lsg.: Afrika (~30,5 %) liegt vor Australien/Ozeanien (~11,3 %), Asien (~0,76 %) und Nordamerika (~0,50 %).',
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
      'Brüssel (Belgien) ist Sitz von 2 Organisationen (EU, NATO) bei 3 Landesmitgliedschaften (UN, EU, NATO: 3 <= 4). Berlin (G7: 1 Sitz, 5 Mitgliedschaften) scheidet mit 5 > 2 aus.',
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
      'WICHTIGE PostgreSQL-Falle: Bei `ORDER BY Flaeche DESC` stehen `NULL`-Werte standardmäßig ZUERST! Erst `WHERE Flaeche IS NOT NULL` (oder `> 0`) liefert Sahara (1), Grosse Victoriawueste (2), Grosse Sandwueste (3), Taklamakan (4), Simpsonwueste (5).',
  },
];
