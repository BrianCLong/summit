import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'flake_signatures.json');
const REPORT_PATH = 'flake_report.json';

interface TestFailure {
    testFilePath: string;
    testName: string;
    errorMessage: string;
}

interface FlakeSignature {
    id: string;
    pattern: string; // Regex string
    category: 'ASYNC_RACE' | 'ORDER_SENSITIVITY' | 'NON_DETERMINISTIC_API' | 'RESOURCE_CONTENTION' | 'UNKNOWN';
    description: string;
}

const DEFAULT_SIGNATURES: FlakeSignature[] = [
    { id: 'sig-001', pattern: 'Exceeded timeout', category: 'ASYNC_RACE', description: 'Test timed out, likely waiting for async operation or deadlock.' },
    { id: 'sig-002', pattern: 'received: serializes to the same string', category: 'NON_DETERMINISTIC_API', description: 'Jest snapshot mismatch, often due to non-deterministic output.' },
    { id: 'sig-003', pattern: 'ECONNREFUSED', category: 'RESOURCE_CONTENTION', description: 'Connection refused, likely service startup race or port collision.' },
    { id: 'sig-004', pattern: 'eturns a boolean indicating whether the integer is a prime number', category: 'UNKNOWN', description: 'Example signature.' }, // cleaned up below
    { id: 'sig-005', pattern: 'deadlock detected', category: 'ASYNC_RACE', description: 'Database deadlock detected.' },
];

function loadSignatures(): FlakeSignature[] {
    if (fs.existsSync(DB_PATH)) {
        return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    }
    return DEFAULT_SIGNATURES;
}

function saveSignatures(sigs: FlakeSignature[]) {
    fs.writeFileSync(DB_PATH, JSON.stringify(sigs, null, 2));
}

function analyzeJestResults(filePath: string): TestFailure[] {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const failures: TestFailure[] = [];

    if (!data.testResults) return [];

    for (const suite of data.testResults) {
        for (const assertion of suite.assertionResults) {
            if (assertion.status === 'failed') {
                failures.push({
                    testFilePath: suite.name,
                    testName: assertion.fullName,
                    errorMessage: assertion.failureMessages.join('\n')
                });
            }
        }
    }
    return failures;
}

function classifyFailure(failure: TestFailure, signatures: FlakeSignature[]) {
    for (const sig of signatures) {
        if (new RegExp(sig.pattern, 'i').test(failure.errorMessage)) {
            return sig;
        }
    }
    return null;
}

async function run() {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.error('Usage: ts-node analyzer.ts <results.json>');
        process.exit(1);
    }

    const resultsFile = args[0];
    if (!fs.existsSync(resultsFile)) {
        console.error(`File not found: ${resultsFile}`);
        process.exit(1);
    }

    console.log(`[FlakeAnalyzer] Analyzing ${resultsFile}...`);
    const failures = analyzeJestResults(resultsFile);
    const signatures = loadSignatures();

    const report = {
        totalFailures: failures.length,
        classified: [] as any[],
        unclassified: [] as any[],
        riskScore: 0
    };

    for (const fail of failures) {
        const sig = classifyFailure(fail, signatures);
        if (sig) {
            report.classified.push({ ...fail, signature: sig });
            report.riskScore += 10; // Arbitrary weight
        } else {
            report.unclassified.push(fail);
            report.riskScore += 5;
        }
    }

    // Save Report
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log(`[FlakeAnalyzer] Report saved to ${REPORT_PATH}`);
    console.log(`[FlakeAnalyzer] Risk Score: ${report.riskScore}`);

    // If unclassified failures exist, suggest adding them to DB?
    // For now, just log them.
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
