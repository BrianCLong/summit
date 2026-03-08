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
const REQUIRED_KEYWORDS = [
    'Replayable Lineage',
    'Deterministic IDs',
    'Idempotency'
];
async function verify() {
    console.log('Verifying Lineage Compliance...');
    // 1. Check AGENTS.md
    const agentsPath = path.join(process.cwd(), 'AGENTS.md');
    if (fs.existsSync(agentsPath)) {
        const content = fs.readFileSync(agentsPath, 'utf-8');
        const missing = REQUIRED_KEYWORDS.filter(k => !content.includes(k));
        if (missing.length > 0) {
            console.error(`AGENTS.md is missing required governance mandates: ${missing.join(', ')}`);
            process.exit(1);
        }
        console.log('AGENTS.md contains required mandates.');
    }
    else {
        console.warn('AGENTS.md not found. Skipping check.');
    }
    // 2. Check Ledger Code (heuristic)
    const ledgerPath = path.join(process.cwd(), 'server/src/provenance/ledger.ts');
    if (fs.existsSync(ledgerPath)) {
        const content = fs.readFileSync(ledgerPath, 'utf-8');
        if (!content.includes('ON CONFLICT') && !content.includes('Idempotency')) {
            console.error('ProvenanceLedger implementation does not appear to handle idempotency (missing ON CONFLICT or "Idempotency" check).');
            process.exit(1);
        }
        console.log('ProvenanceLedger appears to handle idempotency.');
    }
    console.log('Lineage Compliance Verification Passed.');
}
verify();
