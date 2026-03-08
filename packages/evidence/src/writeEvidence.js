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
exports.writeEvidence = writeEvidence;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
async function writeEvidence(report, outputDir = 'artifacts/evidence') {
    const runDir = path.join(outputDir, report.packName.replace('/', '-'), report.runId);
    await fs.promises.mkdir(runDir, { recursive: true });
    // 1. Write Report
    const reportPath = path.join(runDir, 'report.json');
    // Sort keys for determinism
    const reportJson = JSON.stringify(report, Object.keys(report).sort(), 2);
    await fs.promises.writeFile(reportPath, reportJson);
    // 2. Compute Stamp (hash of report)
    const hash = crypto.createHash('sha256').update(reportJson).digest('hex');
    const stamp = {
        hash,
        version: '1.0.0',
    };
    const stampPath = path.join(runDir, 'stamp.json');
    await fs.promises.writeFile(stampPath, JSON.stringify(stamp, null, 2));
    return runDir;
}
