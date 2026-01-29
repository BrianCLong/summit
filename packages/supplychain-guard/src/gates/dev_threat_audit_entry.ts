import fs from 'fs';
import path from 'path';
import { runGate } from '../runner.js';
import { scanForDevThreats } from './dev_threat_audit.js';

async function main() {
  await runGate('dev-threat-audit', async () => {

    // Scan
    console.log('Scanning repo for developer threat patterns...');
    const findingsObjects = scanForDevThreats(process.cwd());

    // Inject test failure if requested
    if (process.env.TEST_FAIL_THREAT_GATE) {
        findingsObjects.push({
            file: 'test-injection.ps1',
            pattern: '/powershell -enc/i',
            line: 1
        });
    }

    console.log(`Found ${findingsObjects.length} suspicious patterns.`);

    const findings = findingsObjects.map(f =>
        `Suspicious pattern ${f.pattern} found in ${f.file}:${f.line}`
    );

    return { ok: findings.length === 0, findings };
  });
}

main();
