"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'flake_signatures.json');
const REPORT_PATH = 'flake_report.json';
const DEFAULT_SIGNATURES = [
    { id: 'sig-001', pattern: 'Exceeded timeout', category: 'ASYNC_RACE', description: 'Test timed out, likely waiting for async operation or deadlock.' },
    { id: 'sig-002', pattern: 'received: serializes to the same string', category: 'NON_DETERMINISTIC_API', description: 'Jest snapshot mismatch, often due to non-deterministic output.' },
    { id: 'sig-003', pattern: 'ECONNREFUSED', category: 'RESOURCE_CONTENTION', description: 'Connection refused, likely service startup race or port collision.' },
    { id: 'sig-004', pattern: 'eturns a boolean indicating whether the integer is a prime number', category: 'UNKNOWN', description: 'Example signature.' }, // cleaned up below
    { id: 'sig-005', pattern: 'deadlock detected', category: 'ASYNC_RACE', description: 'Database deadlock detected.' },
];
function loadSignatures() {
    if (fs.existsSync(DB_PATH)) {
        return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    }
    return DEFAULT_SIGNATURES;
}
function saveSignatures(sigs) {
    fs.writeFileSync(DB_PATH, JSON.stringify(sigs, null, 2));
}
function analyzeJestResults(filePath) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const failures = [];
    if (!data.testResults)
        return [];
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
function classifyFailure(failure, signatures) {
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
        classified: [],
        unclassified: [],
        riskScore: 0
    };
    for (const fail of failures) {
        const sig = classifyFailure(fail, signatures);
        if (sig) {
            report.classified.push({ ...fail, signature: sig });
            report.riskScore += 10; // Arbitrary weight
        }
        else {
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
