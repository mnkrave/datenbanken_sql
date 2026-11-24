import { useId } from 'react';
import type { QueryResult } from '../types/sql';

interface ResultTableProps {
  title: string;
  result: QueryResult;
}

export function ResultTable({ title, result }: ResultTableProps) {
  const captionId = useId();

  if (result.columns.length === 0) {
    return (
      <p className="empty-state">
        Abfrage erfolgreich ausgeführt, es wurden keine Spalten zurückgegeben.
      </p>
    );
  }

  return (
    <div
      tabIndex={0}
      role="region"
      aria-labelledby={captionId}
      className="table-wrapper"
    >
      <table className="data-table">
        <caption id={captionId}>
          {title} · {result.rowCount} {result.rowCount === 1 ? 'Zeile' : 'Zeilen'} ({result.durationMs} ms)
        </caption>
        <thead>
          <tr>
            {result.columns.map((col, idx) => (
              <th key={`${col}-${idx}`} scope="col">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.length === 0 ? (
            <tr>
              <td colSpan={result.columns.length} className="empty-state">
                Leere Ergebnismenge (0 Zeilen)
              </td>
            </tr>
          ) : (
            result.rows.map((row, rIdx) => (
              <tr key={rIdx}>
                {row.map((cell, cIdx) => (
                  <td key={cIdx} data-col={result.columns[cIdx]}>
                    {cell === null ? (
                      <span className="null-pill">NULL</span>
                    ) : (
                      String(cell)
                    )}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
