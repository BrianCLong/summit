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
exports.DecisionLedger = void 0;
const fs = __importStar(require("fs"));
class DecisionLedger {
    ledgerPath;
    constructor(ledgerPath) {
        this.ledgerPath = ledgerPath;
        if (!fs.existsSync(ledgerPath)) {
            fs.writeFileSync(ledgerPath, JSON.stringify([], null, 2));
        }
    }
    record(decision) {
        const record = {
            id: Math.random().toString(36).substring(2, 15),
            timestamp: new Date().toISOString(),
            ...decision,
            reverted: false,
        };
        const ledger = this.readLedger();
        ledger.push(record);
        this.writeLedger(ledger);
        return record;
    }
    replay(sinceTimestamp) {
        const ledger = this.readLedger();
        if (!sinceTimestamp) {
            return ledger;
        }
        return ledger.filter(r => r.timestamp >= sinceTimestamp);
    }
    async rollback(decisionId, undoAction) {
        const ledger = this.readLedger();
        const recordIndex = ledger.findIndex(r => r.id === decisionId);
        if (recordIndex === -1) {
            throw new Error(`Decision ${decisionId} not found`);
        }
        const record = ledger[recordIndex];
        if (record.reverted) {
            console.log(`Decision ${decisionId} already reverted`);
            return;
        }
        console.log(`Rolling back decision ${decisionId}: ${JSON.stringify(record.decision)}`);
        await undoAction(record);
        record.reverted = true;
        ledger[recordIndex] = record;
        this.writeLedger(ledger);
    }
    readLedger() {
        const content = fs.readFileSync(this.ledgerPath, 'utf-8');
        try {
            return JSON.parse(content);
        }
        catch (e) {
            return [];
        }
    }
    writeLedger(ledger) {
        fs.writeFileSync(this.ledgerPath, JSON.stringify(ledger, null, 2));
    }
}
exports.DecisionLedger = DecisionLedger;
