import { useEffect } from 'react';
import { CalendarCheck2, Database, FileText, Flame, Library, Moon, RotateCcw, Sun } from 'lucide-react';

export type AppView = 'daily' | 'sheets' | 'catalog' | 'workspace';

interface HeaderProps {
  view: AppView;
  onNavigate: (view: 'daily' | 'sheets' | 'catalog') => void;
  dailySolvedCount: number;
  dailyTotalCount: number;
  sheetsSolvedCount: number;
  sheetsTotalCount: number;
  totalSolvedCount: number;
  totalExerciseCount: number;
  streak: number;
  onRequestReset: () => void;
}

function getSystemScheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyMetaScheme(stored: string | null) {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (meta) {
    meta.content = stored === 'dark' || stored === 'light' ? stored : 'light dark';
  }
}

export function Header({
  view,
  onNavigate,
  dailySolvedCount,
  dailyTotalCount,
  sheetsSolvedCount,
  sheetsTotalCount,
  totalSolvedCount,
  totalExerciseCount,
  streak,
  onRequestReset,
}: HeaderProps) {
  // Stay in sync when another browser tab changes color-scheme
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'color-scheme') {
        applyMetaScheme(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Two-state toggle logic per modern-web-guidance `dark-mode-toggle`:
  // Reverts to system (removes stored override) when target matches current system preference.
  const handleToggleTheme = () => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem('color-scheme');
    } catch {
      stored = null;
    }
    const system = getSystemScheme();
    const currentlyRendered: 'dark' | 'light' =
      stored === 'dark' || stored === 'light' ? stored : system;
    const target: 'dark' | 'light' = currentlyRendered === 'dark' ? 'light' : 'dark';

    if (target === system) {
      try {
        localStorage.removeItem('color-scheme');
      } catch {
        // Ignore storage errors while still updating meta
      }
      applyMetaScheme(null);
    } else {
      try {
        localStorage.setItem('color-scheme', target);
      } catch {
        // Ignore storage errors while still updating meta
      }
      applyMetaScheme(target);
    }
  };

  return (
    <header className="site-header">
      <a href="#main-content" className="skip-link visually-hidden">
        Zum Hauptinhalt springen
      </a>
      <div className="header-inner">
        <button
          type="button"
          className="brand-btn"
          onClick={() => onNavigate('daily')}
        >
          <span className="brand-icon" aria-hidden="true">
            <Database size={20} />
          </span>
          <span>
            <span className="brand-title">DBS I · SQL-Trainer</span>
            <span className="brand-sub">8 Klausur-Schemas · PostgreSQL Live</span>
          </span>
        </button>

        <nav className="header-nav" aria-label="Hauptnavigation">
          <button
            type="button"
            className="nav-pill"
            aria-current={view === 'daily' ? 'page' : undefined}
            onClick={() => onNavigate('daily')}
          >
            <CalendarCheck2 size={16} aria-hidden="true" />
            Tages-Training
          </button>
          <button
            type="button"
            className="nav-pill"
            aria-current={view === 'sheets' ? 'page' : undefined}
            onClick={() => onNavigate('sheets')}
          >
            <FileText size={16} aria-hidden="true" />
            Übungsblätter ({sheetsSolvedCount}/{sheetsTotalCount})
          </button>
          <button
            type="button"
            className="nav-pill"
            aria-current={view === 'catalog' ? 'page' : undefined}
            onClick={() => onNavigate('catalog')}
          >
            <Library size={16} aria-hidden="true" />
            Alle Schemas ({totalSolvedCount}/{totalExerciseCount})
          </button>
        </nav>

        <div className="header-actions">
          <span
            className={`stat-chip ${dailySolvedCount === dailyTotalCount ? 'stat-chip--done' : ''}`}
          >
            Heute: {dailySolvedCount}/{dailyTotalCount}
          </span>
          <span className="stat-chip stat-chip--streak">
            <Flame size={14} aria-hidden="true" />
            {streak} {streak === 1 ? 'Tag' : 'Tage'}
          </span>

          <button
            type="button"
            className="btn icon-btn theme-toggle"
            onClick={handleToggleTheme}
          >
            <span className="option-to-dark">
              <Moon size={16} aria-hidden="true" />
              <span className="visually-hidden">Zu dunklem Design wechseln</span>
            </span>
            <span className="option-to-light">
              <Sun size={16} aria-hidden="true" />
              <span className="visually-hidden">Zu hellem Design wechseln</span>
            </span>
          </button>

          <button
            type="button"
            className="btn icon-btn btn-ghost"
            onClick={onRequestReset}
            aria-label="Fortschritt zurücksetzen"
          >
            <RotateCcw size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
