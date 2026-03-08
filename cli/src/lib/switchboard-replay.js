"use strict";
/**
 * Switchboard Capsule Replay
 */
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
exports.replayCapsule = replayCapsule;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const switchboard_runner_js_1 = require("./switchboard-runner.js");
const switchboard_ledger_js_1 = require("./switchboard-ledger.js");
function readText(filePath) {
    if (!fs.existsSync(filePath)) {
        return '';
    }
    return fs.readFileSync(filePath, 'utf8');
}
function listFiles(dirPath) {
    if (!fs.existsSync(dirPath)) {
        return [];
    }
    const results = [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            results.push(...listFiles(fullPath).map((child) => path.join(entry.name, child)));
        }
        else if (entry.isFile()) {
            results.push(entry.name);
        }
    }
    return results.sort();
}
function compareOutputs(originalDir, replayDir) {
    const diffs = [];
    const originalFiles = listFiles(originalDir);
    const replayFiles = listFiles(replayDir);
    const allFiles = Array.from(new Set([...originalFiles, ...replayFiles])).sort();
    for (const file of allFiles) {
        const originalPath = path.join(originalDir, file);
        const replayPath = path.join(replayDir, file);
        if (!fs.existsSync(originalPath)) {
            diffs.push(`Missing original output: ${file}`);
            continue;
        }
        if (!fs.existsSync(replayPath)) {
            diffs.push(`Missing replay output: ${file}`);
            continue;
        }
        const originalText = readText(originalPath);
        const replayText = readText(replayPath);
        if (originalText !== replayText) {
            diffs.push(`Output mismatch: ${file}`);
        }
    }
    return { match: diffs.length === 0, differences: diffs };
}
function normalizeLedger(entry) {
    const { timestamp, prev_hash, entry_hash, session_id, seq, ...rest } = entry;
    const data = entry.data;
    if (entry.type === 'tool_exec') {
        const { duration_ms, ...remaining } = data;
        return { ...rest, data: remaining };
    }
    return { ...rest, data };
}
function comparePolicy(originalLedger, replayLedger) {
    const originalEntries = (0, switchboard_ledger_js_1.readLedgerEntries)(originalLedger)
        .filter((entry) => ['policy_decision', 'test_result', 'tool_exec', 'diff_hash'].includes(entry.type))
        .map((entry) => normalizeLedger(entry));
    const replayEntries = (0, switchboard_ledger_js_1.readLedgerEntries)(replayLedger)
        .filter((entry) => ['policy_decision', 'test_result', 'tool_exec', 'diff_hash'].includes(entry.type))
        .map((entry) => normalizeLedger(entry));
    const serializedOriginal = JSON.stringify(originalEntries, null, 2);
    const serializedReplay = JSON.stringify(replayEntries, null, 2);
    if (serializedOriginal === serializedReplay) {
        return { match: true, differences: [] };
    }
    return { match: false, differences: ['Ledger entries differ between runs'] };
}
async function replayCapsule(repoRoot, sessionId) {
    const originalSessionDir = path.join(repoRoot, '.switchboard', 'capsules', sessionId);
    const manifestPath = path.join(originalSessionDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
        throw new Error(`Capsule manifest missing for session: ${sessionId}`);
    }
    const replayResult = await (0, switchboard_runner_js_1.runCapsule)({
        manifestPath,
        repoRoot,
    });
    const diffOriginal = readText(path.join(originalSessionDir, 'diff.patch'));
    const diffReplay = readText(path.join(replayResult.sessionDir, 'diff.patch'));
    const diffMatch = diffOriginal === diffReplay;
    const diffDifferences = diffMatch ? [] : ['Diff output mismatch'];
    const outputComparison = compareOutputs(path.join(originalSessionDir, 'outputs'), path.join(replayResult.sessionDir, 'outputs'));
    const policyComparison = comparePolicy(path.join(originalSessionDir, 'ledger.jsonl'), path.join(replayResult.sessionDir, 'ledger.jsonl'));
    const originalLedgerValidation = (0, switchboard_ledger_js_1.verifyLedger)(path.join(originalSessionDir, 'ledger.jsonl'));
    const replayLedgerValidation = (0, switchboard_ledger_js_1.verifyLedger)(path.join(replayResult.sessionDir, 'ledger.jsonl'));
    const ledgerMatch = originalLedgerValidation.valid && replayLedgerValidation.valid;
    const differences = [
        ...diffDifferences,
        ...outputComparison.differences,
        ...policyComparison.differences,
    ];
    if (!originalLedgerValidation.valid) {
        differences.push('Original ledger hash chain invalid');
    }
    if (!replayLedgerValidation.valid) {
        differences.push('Replay ledger hash chain invalid');
    }
    const report = {
        original_session: sessionId,
        replay_session: replayResult.sessionId,
        match: differences.length === 0 && ledgerMatch,
        diff_match: diffMatch,
        outputs_match: outputComparison.match,
        policy_match: policyComparison.match,
        ledger_validations: {
            original_valid: originalLedgerValidation.valid,
            replay_valid: replayLedgerValidation.valid,
        },
        differences,
    };
    fs.writeFileSync(path.join(replayResult.sessionDir, 'replay-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    return report;
}
