import fs from 'fs';
export async function runEval(id: string): Promise<number> {
  const def = parseYaml(fs.readFileSync(`evals/${id}.yaml`, 'utf8'));
  // 1) apply patch, 2) run tests, 3) compute risk, 4) structured checks
  const s = 0.91; // mocked score
  await fs.promises.writeFile(
    `artifacts/evals/${id}.json`,
    JSON.stringify({ score: s }, null, 2),
  );
  return s;
}
