import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runGate } from '../runner.js';
import { evaluateDependencyIntake, scanRepoDependencies, Denylist } from './dependency_intake.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  await runGate('dependency-intake', async () => {
    // Load rules
    // The structure is src/gates/entry.ts, rules are in src/rules/denylist.json
    // So ../rules/denylist.json from here
    const rulesPath = path.join(__dirname, '../rules/denylist.json');
    let rules: Denylist = { packages: [], patterns: [] };

    if (fs.existsSync(rulesPath)) {
        rules = JSON.parse(fs.readFileSync(rulesPath, 'utf-8'));
    } else {
        console.warn(`Denylist rules not found at ${rulesPath}, using empty rules.`);
    }

    // Scan
    console.log('Scanning repo for package.json files...');
    const deps = scanRepoDependencies(process.cwd());

    if (process.env.TEST_FAIL_INTAKE_GATE) {
        deps.push({ name: 'malicious-payload', version: '6.6.6', sourceFile: 'test-injection' });
    }

    console.log(`Found ${deps.length} dependencies to check.`);

    // Evaluate
    const findingsObjects = evaluateDependencyIntake(deps, rules);

    const findings = findingsObjects.map(f =>
        `${f.severity.toUpperCase()}: ${f.reason} found in ${f.dep.name}@${f.dep.version} (${f.dep.sourceFile})`
    );

    return { ok: findings.length === 0, findings };
  });
}

main();
