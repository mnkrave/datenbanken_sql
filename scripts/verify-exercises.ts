import {
  ALL_REGISTERED_EXERCISES,
  ALL_SCHEMAS_WITH_EXTRAS,
  getExerciseById,
} from '../src/data/schemas';
import { WORKSHEETS } from '../src/data/sheets';
import { evaluateExercise } from '../src/engine/evaluator';
import { getPhysicalTables } from '../src/engine/pgEngine';

async function main() {
  console.log(
    `Verifying ${ALL_SCHEMAS_WITH_EXTRAS.length} schemas and ${ALL_REGISTERED_EXERCISES.length} exercises in PGlite (PostgreSQL WASM)...\n`
  );

  for (const schema of ALL_SCHEMAS_WITH_EXTRAS) {
    const tables = await getPhysicalTables(schema.id);
    console.log(
      `✓ Schema [${schema.id}] loaded (${tables.length} physical tables: ${tables.join(', ')})`
    );
  }

  console.log('');
  let failed = 0;

  for (const ex of ALL_REGISTERED_EXERCISES) {
    const res = await evaluateExercise(ex, ex.solutionSql);
    const hasRows = Boolean(res.expectedResult && res.expectedResult.rowCount > 0);
    if (res.status !== 'correct' || (!ex.allowEmptyExpected && !hasRows)) {
      console.error(
        `✗ FAIL [${ex.id}] (${ex.title}): status=${res.status}, rows=${res.expectedResult?.rowCount ?? 0}`
      );
      if (res.errorMessage) console.error(`  Error: ${res.errorMessage}`);
      if (res.details.length) console.error(`  Details: ${res.details.join(' | ')}`);
      failed++;
      continue;
    }

    if (res.expectedResult && res.expectedResult.columns.length !== ex.expectedColumns.length) {
      console.error(
        `✗ COLUMN MISMATCH [${ex.id}]: expectedColumns=${ex.expectedColumns.length}, actual=${res.expectedResult.columns.length}`
      );
      failed++;
      continue;
    }

    // Verify all alternative solutions also pass!
    if (ex.alternativeSolutions) {
      for (let i = 0; i < ex.alternativeSolutions.length; i++) {
        const altRes = await evaluateExercise(ex, ex.alternativeSolutions[i]);
        if (altRes.status !== 'correct') {
          console.error(
            `✗ ALT FAIL [${ex.id} #${i + 1}]: ${altRes.headline} — ${altRes.details.join(' | ')} ${altRes.errorMessage ?? ''}`
          );
          failed++;
        }
      }
    }

    console.log(
      `✓ [${ex.schemaId.padEnd(11)}] ${ex.id.padEnd(36)} → ${String(res.expectedResult?.rowCount ?? 0).padStart(2)} rows (${res.expectedResult?.columns.join(', ')})`
    );
  }

  // Verify all WORKSHEETS references resolve cleanly (no broken links)
  console.log('\nVerifying WORKSHEETS references & negative guard checks...');
  for (const sheet of WORKSHEETS) {
    for (const task of sheet.tasks) {
      for (const sub of task.subtasks) {
        if (!getExerciseById(sub.exerciseId)) {
          console.error(
            `✗ DEAD LINK in Blatt ${sheet.sheetNumber} ${task.taskNumber} ${sub.label}: ${sub.exerciseId}`
          );
          failed++;
        }
      }
    }
  }

  // Guard checks for forbidden EXISTS (Blatt 5 1j1 / 1j2), singleStatementOnly (Blatt 6 2b), extraTestCases (Blatt 7 2b)
  const j1 = getExerciseById('blatt05-1j1-d-ohne-exists')!;
  const j1Bad = await evaluateExercise(
    j1,
    'SELECT L.* FROM L WHERE EXISTS (SELECT * FROM R WHERE L.c = R.c);'
  );
  if (j1Bad.status !== 'wrong') {
    console.error(`✗ GUARD FAIL [${j1.id}]: EXISTS query was not rejected`);
    failed++;
  } else {
    console.log(`✓ Guard [${j1.id}] rejects EXISTS`);
  }

  const j2 = getExerciseById('blatt05-1j2-h-ohne-exists')!;
  const j2Bad = await evaluateExercise(
    j2,
    'SELECT R.* FROM R WHERE EXISTS (SELECT * FROM L WHERE L.c = R.c);'
  );
  if (j2Bad.status !== 'wrong') {
    console.error(`✗ GUARD FAIL [${j2.id}]: EXISTS query was not rejected`);
    failed++;
  } else {
    console.log(`✓ Guard [${j2.id}] rejects EXISTS`);
  }

  const b62b = getExerciseById('blatt06-2b-bahn-delete-sylt')!;
  const b62bBad = await evaluateExercise(
    b62b,
    "DELETE FROM Teilstrecke WHERE vonBhf = 'Niebüll'; DELETE FROM Verbindung WHERE ZugNr = 302;"
  );
  if (b62bBad.status !== 'wrong') {
    console.error(`✗ GUARD FAIL [${b62b.id}]: multi-statement query was not rejected`);
    failed++;
  } else {
    console.log(`✓ Guard [${b62b.id}] rejects multiple statements`);
  }

  const b72b = getExerciseById('blatt07-2b-fd-check')!;
  const b72bBad = await evaluateExercise(b72b, "SELECT 'x'::text AS A, 2 AS AnzahlB WHERE false;");
  if (b72bBad.status !== 'wrong') {
    console.error(`✗ GUARD FAIL [${b72b.id}]: dummy empty query was not rejected by extraTestCases`);
    failed++;
  } else {
    console.log(`✓ Guard [${b72b.id}] rejects empty dummy query via extraTestCases`);
  }

  console.log('');
  if (failed > 0) {
    console.error(`FAILED: ${failed} check(s) failed.`);
    process.exit(1);
  }

  console.log(
    `ALL ${ALL_REGISTERED_EXERCISES.length} EXERCISES + ALTERNATIVES + WORKSHEETS + GUARDS VERIFIED SUCCESSFULLY!`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
