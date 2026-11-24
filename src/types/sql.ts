export type SchemaId =
  | 'uni'
  | 'terra'
  | 'bahn'
  | 'weingut'
  | 'unternehmen'
  | 'employee'
  | 'tickets'
  | 'betreuung';

export type Difficulty = 'Basis' | 'Mittel' | 'Klausurniveau';

export interface ColumnDoc {
  name: string;
  type: string;
  isPk?: boolean;
  fkTarget?: string;
  note?: string;
}

export interface TableDoc {
  name: string;
  description: string;
  columns: ColumnDoc[];
}

export interface SchemaDef {
  id: SchemaId;
  title: string;
  shortTitle: string;
  sheets: string;
  summary: string;
  /** Prose bullet points modeled directly on the Übungsblätter */
  explanationBullets: string[];
  /** Exam traps or schema-specific quirks */
  examNotes: string[];
  tables: TableDoc[];
  /** PostgreSQL DDL + INSERT statements to seed the schema */
  seedSql: string;
}

export interface Exercise {
  id: string;
  schemaId: SchemaId;
  title: string;
  /** Source reference, e.g. "Übungsblatt 4 · Aufg. 3" or "Klausurtraining (nach Blatt 4)" */
  source: string;
  difficulty: Difficulty;
  topics: string[];
  prompt: string;
  /** Optional LaTeX display formula (e.g. Relational Algebra expression from Übungsblatt) */
  formulaLatex?: string;
  /** Clear specification of expected output columns, e.g. ["Name"] */
  expectedColumns: string[];
  /** Whether row order matters (true when ORDER BY is explicitly requested) */
  orderMatters: boolean;
  /** Whether duplicates must be eliminated (helps produce targeted DISTINCT diagnostics) */
  requiresDistinct?: boolean;
  /** Valid PostgreSQL reference query */
  solutionSql: string;
  /** Optional alternative solutions shown in explanation or tested in verification */
  alternativeSolutions?: string[];
  hints: string[];
  solutionExplanation: string;
  /** Optional starter SQL shown when user clicks "Startvorlage" or empty by default */
  starterSql?: string;
}

export interface QueryResult {
  columns: string[];
  rows: (string | number | boolean | null)[][];
  rowCount: number;
  durationMs: number;
}

export interface SqlErrorExcerpt {
  lineNumber: number;
  lineText: string;
  caretOffset: number;
  caretLength: number;
  prevLineNumber?: number;
  prevLineText?: string;
}

export interface SqlErrorInfo {
  rawMessage: string;
  sqlState?: string;
  title: string;
  explanation: string;
  fixSuggestion?: string;
  line?: number;
  column?: number;
  excerpt?: SqlErrorExcerpt;
}

export type EvaluationStatus = 'correct' | 'wrong' | 'error' | 'sandbox';

export interface EvaluationResult {
  status: EvaluationStatus;
  userResult?: QueryResult;
  expectedResult?: QueryResult;
  headline: string;
  details: string[];
  errorMessage?: string;
  errorInfo?: SqlErrorInfo;
}

export interface ProgressState {
  /** Map of exerciseId -> ISO date string when last solved */
  solvedIds: Record<string, string>;
  /** Dates (YYYY-MM-DD) on which at least one exercise was solved */
  activeDays: string[];
  /** Dates (YYYY-MM-DD) on which all 8 daily exercises were completed */
  completedDailyDates: string[];
  /** Saved user SQL drafts keyed by exerciseId */
  drafts: Record<string, string>;
}
