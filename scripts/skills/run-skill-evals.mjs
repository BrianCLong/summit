import { promises as fs } from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const evalRoot = process.argv[2] ?? 'evals/skills';

const suiteDirs = (await fs.readdir(evalRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(evalRoot, entry.name));

const failures = [];

for (const suiteDir of suiteDirs) {
  const assertionsPath = path.join(suiteDir, 'assertions.yaml');
  const raw = await fs.readFile(assertionsPath, 'utf8');
  const suite = yaml.load(raw);
  const assertionMap = new Map(
    suite.assertions.map((assertion) => [assertion.id, assertion]),
  );

  for (const testCase of suite.cases) {
    const casePath = path.join(suiteDir, testCase.file);
    const output = await fs.readFile(casePath, 'utf8');
    for (const assertionId of testCase.asserts) {
      const assertion = assertionMap.get(assertionId);
      if (!assertion) {
        failures.push({
          suite: suite.suite,
          case: testCase.id,
          message: `Unknown assertion ${assertionId}`,
        });
        continue;
      }
      const regex = new RegExp(assertion.pattern, 'i');
      if (!regex.test(output)) {
        failures.push({
          suite: suite.suite,
          case: testCase.id,
          message: `Missing pattern for ${assertionId}: ${assertion.pattern}`,
        });
      }
    }
  }
}

if (failures.length > 0) {
  console.error('Skill evals failed:');
  for (const failure of failures) {
    console.error(`- [${failure.suite}] ${failure.case}: ${failure.message}`);
  }
  process.exit(1);
}

console.log(`Skill evals passed for ${suiteDirs.length} suites.`);
