export type SchemaId =
  | 'uni'
  | 'terra'
  | 'bahn'
  | 'weingut'
  | 'unternehmen'
  | 'employee'
  | 'tickets'
  | 'betreuung'
  | 'lr_semijoin'
  | 'fd_relation';

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
  /** Optional SQL executed inside the rolled-back transaction before user/reference SQL (e.g. DROP TABLE for DDL tasks) */
  setupSql?: string;
  /** Optional SQL executed after user/reference SQL to inspect DB state for DDL/DML exercises */
  verificationSql?: string;
  /** Explanatory text shown in the workspace spec-box for verificationSql tasks */
  verificationNote?: string;
  /** Regex pattern (case-insensitive, checked on comment-stripped SQL) for forbidden keywords */
  forbiddenSqlPattern?: string;
  /** German explanation shown when forbiddenSqlPattern matches */
  forbiddenSqlMessage?: string;
  /** Require exactly one SQL statement (e.g. Blatt 6 Aufg. 2b) */
  singleStatementOnly?: boolean;
  /** Allow empty expected result on the base schema instance when extraTestCases verify non-empty violations */
  allowEmptyExpected?: boolean;
  /** Additional rolled-back test cases run against both solutionSql and userSql */
  extraTestCases?: { label: string; setupSql: string }[];
}

export interface WorksheetSubtask {
  label: string;
  exerciseId: string;
  kindBadge?: string;
}

export interface WorksheetTaskGroup {
  id: string;
  taskNumber: string;
  title: string;
  schemaId: SchemaId;
  intro: string;
  isOfficialSql: boolean;
  originalKind?: string;
  subtasks: WorksheetSubtask[];
}

export interface WorksheetDef {
  sheetNumber: number;
  title: string;
  date: string;
  chapters: string;
  summary: string;
  infoNote?: string;
  tasks: WorksheetTaskGroup[];
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
