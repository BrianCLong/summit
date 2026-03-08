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
exports.emitDeterministicEvidence = emitDeterministicEvidence;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function emitDeterministicEvidence(evidence) {
    const dir = path.join(process.cwd(), 'artifacts');
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
    // Determinism Rules: No wall-clock timestamps
    fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify({
        jobId: evidence.jobId,
        idempotencyHash: evidence.idempotencyHash,
        status: 'enqueued'
    }, null, 2));
    fs.writeFileSync(path.join(dir, 'metrics.json'), JSON.stringify({
        retries: 0, // Deterministic counter based on logical state
        logicalCounter: evidence.logicalCounter
    }, null, 2));
    fs.writeFileSync(path.join(dir, 'stamp.json'), JSON.stringify({
        evidenceId: `EVID-ASYNC-${evidence.idempotencyHash}`
    }, null, 2));
}
