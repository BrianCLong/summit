"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runner_js_1 = require("../runner.js");
const dev_threat_audit_js_1 = require("./dev_threat_audit.js");
async function main() {
    await (0, runner_js_1.runGate)('dev-threat-audit', async () => {
        // Scan
        console.log('Scanning repo for developer threat patterns...');
        const findingsObjects = (0, dev_threat_audit_js_1.scanForDevThreats)(process.cwd());
        // Inject test failure if requested
        if (process.env.TEST_FAIL_THREAT_GATE) {
            findingsObjects.push({
                file: 'test-injection.ps1',
                pattern: '/powershell -enc/i',
                line: 1
            });
        }
        console.log(`Found ${findingsObjects.length} suspicious patterns.`);
        const findings = findingsObjects.map(f => `Suspicious pattern ${f.pattern} found in ${f.file}:${f.line}`);
        return { ok: findings.length === 0, findings };
    });
}
main();
