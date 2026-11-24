import { useId, useRef } from 'react';
import { format as formatSql } from 'sql-formatter';
import { AlignLeft, CheckCircle2, Play, RotateCcw, Terminal } from 'lucide-react';

interface SqlEditorProps {
  value: string;
  onChange: (sql: string) => void;
  onEvaluate: () => void;
  onRunSandbox: () => void;
  onReset: () => void;
  tableNames: string[];
  isRunning: boolean;
  errorLine?: number;
}

export function SqlEditor({
  value,
  onChange,
  onEvaluate,
  onRunSandbox,
  onReset,
  tableNames,
  isRunning,
  errorLine,
}: SqlEditorProps) {
  const textareaId = useId();
  const hintId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const lineCount = Math.max(8, value.split('\n').length);

  const insertSnippet = (snippet: string) => {
    const el = textareaRef.current;
    if (!el) {
      onChange(value ? `${value} ${snippet}` : snippet);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + snippet + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + snippet.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleFormat = () => {
    if (!value.trim()) return;
    try {
      const formatted = formatSql(value, {
        language: 'postgresql',
        keywordCase: 'upper',
        tabWidth: 2,
      });
      onChange(formatted);
    } catch {
      // If SQL is too malformed for sql-formatter, leave user input untouched
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isRunning) onEvaluate();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      insertSnippet('  ');
    }
  };

  return (
    <div>
      <div className="editor-header">
        <label htmlFor={textareaId} className="editor-label">
          <Terminal size={16} aria-hidden="true" />
          Deine SQL-Abfrage (PostgreSQL)
        </label>
        <span id={hintId} className="editor-shortcut">
          Prüfen mit <kbd className="kbd">⌘/Strg</kbd> + <kbd className="kbd">Enter</kbd>
        </span>
      </div>

      <div className="sql-editor-frame">
        <div className="sql-line-numbers" aria-hidden="true">
          {Array.from({ length: lineCount }, (_, i) => {
            const num = i + 1;
            return (
              <div
                key={num}
                className={errorLine === num ? 'sql-line-num--error' : undefined}
              >
                {num}
              </div>
            );
          })}
        </div>
        <textarea
          ref={textareaRef}
          id={textareaId}
          className="sql-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-describedby={hintId}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder="SELECT ..."
        />
      </div>

      {tableNames.length > 0 && (
        <div className="quick-insert-bar">
          <span className="quick-insert-label">Tabellen einfügen:</span>
          {tableNames.slice(0, 10).map((tbl) => (
            <button
              key={tbl}
              type="button"
              className="insert-chip"
              onClick={() => insertSnippet(tbl)}
            >
              {tbl}
            </button>
          ))}
        </div>
      )}

      <div className="editor-actions">
        <div className="editor-actions-left">
          <button
            type="button"
            className="btn btn-primary"
            onClick={onEvaluate}
            disabled={isRunning}
          >
            <CheckCircle2 size={16} aria-hidden="true" />
            {isRunning ? 'Wird ausgeführt…' : 'Ausführen & Prüfen'}
          </button>
          <button
            type="button"
            className="btn"
            onClick={onRunSandbox}
            disabled={isRunning}
          >
            <Play size={15} aria-hidden="true" />
            Nur ausführen (Sandbox)
          </button>
        </div>

        <div className="editor-actions-right">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleFormat}
            disabled={isRunning || !value.trim()}
          >
            <AlignLeft size={14} aria-hidden="true" />
            Formatieren
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onReset}
            disabled={isRunning || !value.trim()}
          >
            <RotateCcw size={14} aria-hidden="true" />
            Leeren
          </button>
        </div>
      </div>
    </div>
  );
}
