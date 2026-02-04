import { readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadProcedureFromFile } from '../../agentic/procedures/loader';
import { compileProcedure, serializePlan } from '../../agentic/procedures/compiler/compile';

const repoRoot = resolve(process.cwd());
const examplesDir = resolve(repoRoot, 'procedures', 'examples');

async function compileAll(): Promise<void> {
  const files = (await readdir(examplesDir))
    .filter(file => file.endsWith('.yaml'))
    .sort((left, right) => left.localeCompare(right));

  for (const file of files) {
    const procedurePath = resolve(examplesDir, file);
    const procedure = await loadProcedureFromFile(procedurePath);
    const plan = compileProcedure(procedure);
    const serialized = serializePlan(plan);
    const goldenPath = procedurePath.replace(/\.ya?ml$/, '.plan.json');
    await writeFile(goldenPath, serialized, 'utf8');
  }

  console.log(`Compiled ${files.length} procedures.`);
}

compileAll().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
