"use strict";
/**
 * Switchboard Capsule Ledger
 *
 * Append-only JSONL ledger with hash chaining.
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
exports.CapsuleLedger = void 0;
exports.computeEntryHash = computeEntryHash;
exports.readLedgerEntries = readLedgerEntries;
exports.verifyLedger = verifyLedger;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
function stableStringify(value) {
    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(',')}]`;
    }
    if (value && typeof value === 'object') {
        const entries = Object.entries(value)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, val]) => `"${key}":${stableStringify(val)}`);
        return `{${entries.join(',')}}`;
    }
    return JSON.stringify(value);
}
function computeEntryHash(payload) {
    const data = stableStringify(payload);
    return crypto.createHash('sha256').update(data).digest('hex');
}
class CapsuleLedger {
    ledgerPath;
    lastHash;
    seq;
    sessionId;
    constructor(sessionDir, sessionId) {
        this.ledgerPath = path.join(sessionDir, 'ledger.jsonl');
        this.lastHash = 'GENESIS';
        this.seq = 0;
        this.sessionId = sessionId;
        fs.mkdirSync(sessionDir, { recursive: true });
    }
    getLedgerPath() {
        return this.ledgerPath;
    }
    append(type, data) {
        const timestamp = new Date().toISOString();
        const entryBase = {
            seq: this.seq + 1,
            timestamp,
            session_id: this.sessionId,
            type,
            data,
            prev_hash: this.lastHash,
        };
        const entryHash = computeEntryHash(entryBase);
        const entry = {
            ...entryBase,
            entry_hash: entryHash,
        };
        fs.appendFileSync(this.ledgerPath, `${JSON.stringify(entry)}\n`, 'utf8');
        this.lastHash = entryHash;
        this.seq += 1;
        return entry;
    }
}
exports.CapsuleLedger = CapsuleLedger;
function readLedgerEntries(ledgerPath) {
    if (!fs.existsSync(ledgerPath)) {
        return [];
    }
    const lines = fs.readFileSync(ledgerPath, 'utf8').split('\n').filter(Boolean);
    return lines.map((line) => JSON.parse(line));
}
function verifyLedger(ledgerPath) {
    const entries = readLedgerEntries(ledgerPath);
    const errors = [];
    let prevHash = 'GENESIS';
    for (const entry of entries) {
        const { entry_hash, ...rest } = entry;
        if (entry.prev_hash !== prevHash) {
            errors.push(`Hash chain mismatch at seq ${entry.seq}`);
        }
        const recomputed = computeEntryHash(rest);
        if (recomputed !== entry_hash) {
            errors.push(`Entry hash mismatch at seq ${entry.seq}`);
        }
        prevHash = entry_hash;
    }
    return { valid: errors.length === 0, errors };
}
