import type { Exercise, SchemaDef, SchemaId } from '../../types/sql';
import { uniSchema, uniExercises } from './uni';
import { terraSchema, terraExercises } from './terra';
import { bahnSchema, bahnExercises } from './bahn';
import { weingutSchema, weingutExercises } from './weingut';
import { unternehmenSchema, unternehmenExercises } from './unternehmen';
import { employeeSchema, employeeExercises } from './employee';
import { ticketsSchema, ticketsExercises } from './tickets';
import { betreuungSchema, betreuungExercises } from './betreuung';
import { SHEET_EXTRA_SCHEMAS, SHEET_ONLY_EXERCISES } from '../sheets';

/** Die 8 zentralen Klausur-Schemas (Basis für Tages-Training & Katalog) */
export const ALL_SCHEMAS: SchemaDef[] = [
  uniSchema,
  terraSchema,
  bahnSchema,
  weingutSchema,
  unternehmenSchema,
  employeeSchema,
  ticketsSchema,
  betreuungSchema,
];

/** Alle Schemas inkl. blattspezifischer Hilfs-Schemas (Blatt 5 L/R & Blatt 7 R) */
export const ALL_SCHEMAS_WITH_EXTRAS: SchemaDef[] = [
  ...ALL_SCHEMAS,
  ...SHEET_EXTRA_SCHEMAS,
];

export const SCHEMA_MAP: Record<SchemaId, SchemaDef> = Object.fromEntries(
  ALL_SCHEMAS_WITH_EXTRAS.map((s) => [s.id, s])
) as Record<SchemaId, SchemaDef>;

/** Alle Aufgaben der 8 Kern-Schemas */
export const ALL_EXERCISES: Exercise[] = [
  ...uniExercises,
  ...terraExercises,
  ...bahnExercises,
  ...weingutExercises,
  ...unternehmenExercises,
  ...employeeExercises,
  ...ticketsExercises,
  ...betreuungExercises,
];

/** Alle registrierten Aufgaben inkl. blattspezifischer DDL-/DML-/Semi-Join-Aufgaben */
export const ALL_REGISTERED_EXERCISES: Exercise[] = [
  ...ALL_EXERCISES,
  ...SHEET_ONLY_EXERCISES,
];

export function getExercisesForSchema(schemaId: SchemaId): Exercise[] {
  return ALL_REGISTERED_EXERCISES.filter((e) => e.schemaId === schemaId);
}

export function getExerciseById(id: string): Exercise | undefined {
  return ALL_REGISTERED_EXERCISES.find((e) => e.id === id);
}
