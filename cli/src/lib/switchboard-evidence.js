"use strict";
/**
 * Switchboard Capsule Evidence Bundle
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
exports.generateEvidenceBundle = generateEvidenceBundle;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const switchboard_ledger_js_1 = require("./switchboard-ledger.js");
function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}
function copyIfExists(src, dest) {
    if (!fs.existsSync(src)) {
        return;
    }
    ensureDir(path.dirname(dest));
    fs.cpSync(src, dest, { recursive: true });
}
function generateEvidenceBundle(repoRoot, sessionId) {
    const sessionDir = path.join(repoRoot, '.switchboard', 'capsules', sessionId);
    if (!fs.existsSync(sessionDir)) {
        throw new Error(`Capsule session not found: ${sessionId}`);
    }
    const evidenceDir = path.join(repoRoot, '.switchboard', 'evidence', sessionId);
    ensureDir(evidenceDir);
    const manifestPath = path.join(sessionDir, 'manifest.json');
    const ledgerPath = path.join(sessionDir, 'ledger.jsonl');
    const diffPath = path.join(sessionDir, 'diff.patch');
    const outputsDir = path.join(sessionDir, 'outputs');
    copyIfExists(manifestPath, path.join(evidenceDir, 'manifest.json'));
    copyIfExists(ledgerPath, path.join(evidenceDir, 'ledger.jsonl'));
    copyIfExists(diffPath, path.join(evidenceDir, 'diffs', 'changes.patch'));
    copyIfExists(outputsDir, path.join(evidenceDir, 'outputs'));
    copyIfExists(path.join(sessionDir, 'replay-report.json'), path.join(evidenceDir, 'replay-report.json'));
    const ledgerEntries = (0, switchboard_ledger_js_1.readLedgerEntries)(ledgerPath);
    const testEntries = ledgerEntries.filter((entry) => entry.type === 'test_result');
    if (testEntries.length > 0) {
        fs.writeFileSync(path.join(evidenceDir, 'test-results.json'), `${JSON.stringify(testEntries, null, 2)}\n`, 'utf8');
    }
    const verification = (0, switchboard_ledger_js_1.verifyLedger)(ledgerPath);
    fs.writeFileSync(path.join(evidenceDir, 'ledger-verification.json'), `${JSON.stringify(verification, null, 2)}\n`, 'utf8');
    return {
        evidenceDir,
        manifestPath: path.join(evidenceDir, 'manifest.json'),
        ledgerPath: path.join(evidenceDir, 'ledger.jsonl'),
        diffPath: path.join(evidenceDir, 'diffs', 'changes.patch'),
    };
}
