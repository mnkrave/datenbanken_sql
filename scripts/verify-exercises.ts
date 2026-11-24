import { ALL_EXERCISES, ALL_SCHEMAS } from '../src/data/schemas';
import { evaluateExercise } from '../src/engine/evaluator';
import { getPhysicalTables } from '../src/engine/pgEngine';

async function main() {
  console.log(`Verifying ${ALL_SCHEMAS.length} schemas and ${ALL_EXERCISES.length} exercises in PGlite (PostgreSQL WASM)...\n`);

  for (const schema of ALL_SCHEMAS) {
    const tables = await getPhysicalTables(schema.id);
    console.log(`✓ Schema [${schema.id}] loaded (${tables.length} physical tables: ${tables.join(', ')})`);
  }

  console.log('');
  let failed = 0;

  for (const ex of ALL_EXERCISES) {
    const res = await evaluateExercise(ex, ex.solutionSql);
    if (res.status !== 'correct' || !res.expectedResult || res.expectedResult.rowCount === 0) {
      console.error(`✗ FAIL [${ex.id}] (${ex.title}): status=${res.status}, rows=${res.expectedResult?.rowCount ?? 0}`);
      if (res.errorMessage) console.error(`  Error: ${res.errorMessage}`);
      if (res.details.length) console.error(`  Details: ${res.details.join(' | ')}`);
      failed++;
      continue;
    }

    if (res.expectedResult.columns.length !== ex.expectedColumns.length) {
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
      `✓ [${ex.schemaId.padEnd(11)}] ${ex.id.padEnd(32)} → ${String(res.expectedResult.rowCount).padStart(2)} rows (${res.expectedResult.columns.join(', ')})`
    );
  }

  console.log('');
  if (failed > 0) {
    console.error(`FAILED: ${failed} check(s) failed.`);
    process.exit(1);
  }

  console.log(`ALL ${ALL_EXERCISES.length} EXERCISES + ALTERNATIVES VERIFIED SUCCESSFULLY!`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
