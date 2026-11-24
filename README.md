# DBS I · SQL-Trainer

Interaktive Web-App zum täglichen SQL-Klausurtraining für **Datenbanksysteme I** — auf Basis aller **8 zentralen SQL- und Anfrage-Schemas** aus den Übungsblättern 3–9.

## Enthaltene Schemas & Aufgabenumfang (54 Aufgaben)

1. **Universitäts-Datenbank (Uni-DB)** — Blatt 4 & Kap. 3–5 (7 Aufgaben)
2. **Terra-Datenbank (Geographie-DB)** — Blatt 5 & 6 (13 Aufgaben)
3. **Streckennetz einer Bahngesellschaft** — Blatt 3, 5 & 6 (6 Aufgaben)
4. **Weingut-Datenbank** — Blatt 3 & 4 (6 Aufgaben)
5. **Angestellte & Abteilung (Unternehmen)** — Blatt 4 (6 Aufgaben)
6. **Mitarbeiterhierarchie (`employee`)** — Blatt 6 (5 Aufgaben)
7. **Ticketverwaltung einer Vorverkaufsstelle** — Blatt 7 (6 Aufgaben)
8. **Sachbearbeiter & Kunde (Kundenbetreuung)** — Blatt 9 (5 Aufgaben)

## Features

- **Echter PostgreSQL-Interpreter im Browser** via `@electric-sql/pglite` (WebAssembly): unterstützt Standard-SQL inkl. `WITH RECURSIVE`, `> ALL`, `= ANY`, `RANK() OVER (...)`, `EXCEPT`, `INTERSECT`, `NATURAL JOIN` und 3-wertige NULL-Logik.
- **Tages-Training:** Jeden Tag automatisch 1 rotierende Aufgabe pro Schema (8 Tagesaufgaben) mit lokal gespeichertem Fortschritt & Streak (`localStorage`).
- **Schema-Erklärung wie im Übungsblatt:** Vollständige Kurzbeschreibung, unterstrichene Primärschlüssel, Fremdschlüssel-Verweise, Klausur-Fallen und interaktive **Live-Daten-Vorschau** jeder Tabelle.
- **Sofortige Auswertung & Diagnose:** Vergleicht die Ergebnistabelle deiner SQL-Abfrage automatisch mit der Musterlösung (inkl. Erkennung von vergessenen `DISTINCT`, falscher Sortierung, vertauschten Spalten oder fehlenden/zusätzlichen Zeilen) sowie einem Sandbox-Modus zum freien Ausprobieren.

## Lokal starten

```bash
npm install
npm run dev
```

## Build & automatische SQL-Verifikation

```bash
# Prüft alle 8 Schemas, alle 54 Musterlösungen und Alternativlösungen in PGlite:
npm run verify-sql

# TypeScript-Check + Produktions-Build:
npm run build
```
