import { useEffect, useState } from 'react';
import { AlertTriangle, Table2 } from 'lucide-react';
import { getPhysicalTables, getTablePreview } from '../engine/pgEngine';
import type { QueryResult, SchemaDef } from '../types/sql';
import { ResultTable } from './ResultTable';

interface SchemaExplorerProps {
  schema: SchemaDef;
}

export function SchemaExplorer({ schema }: SchemaExplorerProps) {
  const [physicalTables, setPhysicalTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [preview, setPreview] = useState<QueryResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    let active = true;
    setSelectedTable(null);
    setPreview(null);
    getPhysicalTables(schema.id)
      .then((tables) => {
        if (!active) return;
        setPhysicalTables(tables);
        if (tables.length > 0) {
          setSelectedTable(tables[0]);
        }
      })
      .catch(() => {
        if (active) setPhysicalTables([]);
      });
    return () => {
      active = false;
    };
  }, [schema.id]);

  useEffect(() => {
    if (!selectedTable) return;
    let active = true;
    setLoadingPreview(true);
    getTablePreview(schema.id, selectedTable, 25)
      .then((res) => {
        if (active) setPreview(res);
      })
      .catch(() => {
        if (active) setPreview(null);
      })
      .finally(() => {
        if (active) setLoadingPreview(false);
      });
    return () => {
      active = false;
    };
  }, [schema.id, selectedTable]);

  return (
    <div className="accordion">
      <details open>
        <summary>
          Schema-Erklärung: {schema.title} ({schema.sheets})
        </summary>
        <div className="details-body">
          <p className="schema-card-summary" style={{ marginBlockEnd: '0.65rem' }}>
            {schema.summary}
          </p>

          <ul className="schema-bullets">
            {schema.explanationBullets.map((bullet, idx) => (
              <li key={idx}>{bullet}</li>
            ))}
          </ul>

          {schema.examNotes.length > 0 && (
            <div className="exam-note-box">
              <div className="exam-note-title">
                <AlertTriangle size={15} aria-hidden="true" />
                Klausur-Hinweise &amp; Besonderheiten
              </div>
              <ul>
                {schema.examNotes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="schema-table-cards">
            {schema.tables.map((tbl) => (
              <div key={tbl.name} className="schema-table-card">
                <div className="schema-table-card-head">
                  <span className="schema-table-name">{tbl.name}</span>
                  <span className="schema-table-desc">{tbl.description}</span>
                </div>
                <ul className="schema-columns-inline" role="list">
                  {tbl.columns.map((col) => (
                    <li
                      key={col.name}
                      className={`col-chip ${col.isPk ? 'col-chip--pk' : ''}`}
                    >
                      <span className="col-name">{col.name}</span>
                      {col.fkTarget && (
                        <span className="col-fk-tag">→ {col.fkTarget}</span>
                      )}
                      {col.note && !col.fkTarget && (
                        <span className="col-fk-tag">({col.note})</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p
            style={{
              margin: '0.65rem 0 0',
              fontSize: '0.76rem',
              color: 'var(--text-secondary)',
            }}
          >
            Notation wie in den Übungsblättern: <u style={{ textDecorationColor: 'var(--accent)', textDecorationThickness: '2px' }}>unterstrichen</u> = Primärschlüssel, <code>→ Tabelle.Spalte</code> = Fremdschlüssel.
          </p>
        </div>
      </details>

      <details>
        <summary>
          <Table2 size={15} aria-hidden="true" />
          Live-Daten in der Datenbank ansehen ({physicalTables.length} Tabellen)
        </summary>
        <div className="details-body">
          <div className="preview-chips" role="group" aria-label="Tabellenauswahl für Vorschau">
            {physicalTables.map((tableName) => (
              <button
                key={tableName}
                type="button"
                className="preview-chip"
                aria-pressed={selectedTable === tableName}
                onClick={() => setSelectedTable(tableName)}
              >
                {tableName}
              </button>
            ))}
          </div>

          {loadingPreview ? (
            <p className="empty-state">Lade Tabellendaten aus PostgreSQL…</p>
          ) : preview && selectedTable ? (
            <ResultTable title={`Tabelle ${selectedTable} (max. 25 Zeilen)`} result={preview} />
          ) : (
            <p className="empty-state">Wähle eine Tabelle aus, um die Beispieldaten zu sehen.</p>
          )}
        </div>
      </details>
    </div>
  );
}
