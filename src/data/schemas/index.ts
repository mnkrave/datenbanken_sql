import type { Exercise, SchemaDef, SchemaId } from '../../types/sql';
import { uniSchema, uniExercises } from './uni';
import { terraSchema, terraExercises } from './terra';
import { bahnSchema, bahnExercises } from './bahn';
import { weingutSchema, weingutExercises } from './weingut';
import { unternehmenSchema, unternehmenExercises } from './unternehmen';
import { employeeSchema, employeeExercises } from './employee';
import { ticketsSchema, ticketsExercises } from './tickets';
import { betreuungSchema, betreuungExercises } from './betreuung';

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

export const SCHEMA_MAP: Record<SchemaId, SchemaDef> = Object.fromEntries(
  ALL_SCHEMAS.map((s) => [s.id, s])
) as Record<SchemaId, SchemaDef>;

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

export function getExercisesForSchema(schemaId: SchemaId): Exercise[] {
  return ALL_EXERCISES.filter((e) => e.schemaId === schemaId);
}

export function getExerciseById(id: string): Exercise | undefined {
  return ALL_EXERCISES.find((e) => e.id === id);
}
