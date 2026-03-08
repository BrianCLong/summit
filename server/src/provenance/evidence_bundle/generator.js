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
exports.generateEvidenceID = generateEvidenceID;
exports.createEvidenceBundle = createEvidenceBundle;
const crypto = __importStar(require("crypto"));
function toBase32(buffer) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let output = '';
    let value = 0;
    let bits = 0;
    for (let i = 0; i < buffer.length; i++) {
        value = (value << 8) | buffer[i];
        bits += 8;
        while (bits >= 5) {
            output += alphabet[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) {
        output += alphabet[(value << (5 - bits)) & 31];
    }
    return output;
}
function canonicalStringify(obj) {
    if (obj === null || typeof obj !== 'object') {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        return '[' + obj.map(canonicalStringify).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalStringify(obj[k])).join(',') + '}';
}
function generateEvidenceID(input, dateStr) {
    const canonicalInput = canonicalStringify(input);
    const hash = crypto.createHash('sha256').update(canonicalInput).digest();
    const base32 = toBase32(hash).substring(0, 6);
    const date = dateStr.slice(0, 10).replace(/-/g, '');
    return `EVID-COG-${date}-${base32}`;
}
function createEvidenceBundle(campaign, enforcementResult) {
    // Determine deterministic timestamp: latest action timestamp or fallback
    let timestamp = new Date().toISOString();
    if (campaign.actions && campaign.actions.length > 0) {
        const sortedActions = [...campaign.actions].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        timestamp = sortedActions[0].timestamp;
    }
    const evidenceId = generateEvidenceID(campaign, timestamp);
    const result = enforcementResult && !enforcementResult.allowed ? 'fail' : 'pass';
    const summary = enforcementResult && !enforcementResult.allowed
        ? `Campaign graph for ${campaign.name}. Violations: ${enforcementResult.violations.map(v => v.policyName).join(', ')}`
        : `Campaign graph for ${campaign.name}`;
    const report = {
        evidence_id: evidenceId,
        subject: {
            type: 'campaign',
            name: campaign.name,
            digest: crypto.createHash('sha256').update(canonicalStringify(campaign)).digest('hex')
        },
        result: result,
        artifacts: [],
        summary: summary
    };
    const metrics = {
        evidence_id: evidenceId,
        metadata: {
            actorCount: campaign.actors.length,
            assetCount: campaign.assets.length,
            narrativeCount: campaign.narratives.length,
            actionCount: campaign.actions.length,
            policyViolations: enforcementResult?.violations.length || 0
        }
    };
    const stamp = {
        timestamp: timestamp
    };
    return { report, metrics, stamp };
}
