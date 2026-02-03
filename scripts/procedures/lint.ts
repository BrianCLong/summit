import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadPolicyFromFile } from '../../agentic/procedures/policy/loadPolicy';
import { loadProcedureFromFile } from '../../agentic/procedures/loader';
import { validateProcedure } from '../../agentic/procedures/validator/validate';
import { compileProcedure, serializePlan } from '../../agentic/procedures/compiler/compile';

const repoRoot = resolve(process.cwd());
const examplesDir = resolve(repoRoot, 'procedures', 'examples');
const policyPath = resolve(
  repoRoot,
  'agentic',
  'procedures',
  'policy',
  'default.policy.yaml',
);

async function lintProcedures(): Promise<number> {
  const policy = await loadPolicyFromFile(policyPath);
  const files = (await readdir(examplesDir))
    .filter(file => file.endsWith('.yaml'))
    .sort((left, right) => left.localeCompare(right));

  const failures: string[] = [];

  for (const file of files) {
    const procedurePath = resolve(examplesDir, file);
    const procedure = await loadProcedureFromFile(procedurePath);
    try {
      validateProcedure(procedure, policy);
    } catch (error) {
      failures.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }

    const plan = compileProcedure(procedure);
    const serialized = serializePlan(plan);
    const goldenPath = procedurePath.replace(/\.ya?ml$/, '.plan.json');
    const golden = await readFile(goldenPath, 'utf8');
    if (serialized !== golden) {
      failures.push(`${file}: golden plan drift detected`);
    }
  }

  if (failures.length > 0) {
    console.error('Procedure lint failed:');
    failures.forEach(line => console.error(`- ${line}`));
    return 1;
  }

  console.log('Procedure lint passed.');
  return 0;
}

lintProcedures()
  .then(code => {
    process.exitCode = code;
  })
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
