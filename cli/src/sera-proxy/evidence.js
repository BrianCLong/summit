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
exports.SeraProxyEvidenceStore = void 0;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class SeraProxyEvidenceStore {
    artifactDir;
    endpointHost;
    entries = [];
    metrics = {
        schemaVersion: '1.0',
        requests: 0,
        blocked: 0,
        bytesIn: 0,
        bytesOut: 0,
    };
    constructor(artifactDir, endpointHost) {
        this.artifactDir = artifactDir;
        this.endpointHost = endpointHost;
        fs.mkdirSync(this.artifactDir, { recursive: true });
    }
    recordExchange(requestBody, responseBody, policyDecisionId) {
        const requestSha256 = sha256Hex(requestBody);
        const responseSha256 = sha256Hex(responseBody);
        const previousHash = this.entries.length > 0 ? this.entries[this.entries.length - 1].entryHash : null;
        const id = `EVID-SERA-CLI-${String(this.entries.length + 1).padStart(4, '0')}`;
        const entryPayload = {
            id,
            endpointHost: this.endpointHost,
            requestSha256,
            responseSha256,
            policyDecisionId,
            previousHash,
        };
        const entryHash = sha256Hex(stableStringify(entryPayload));
        this.entries.push({
            ...entryPayload,
            entryHash,
        });
        this.metrics.requests += 1;
        this.metrics.bytesIn += Buffer.byteLength(requestBody);
        this.metrics.bytesOut += Buffer.byteLength(responseBody);
        this.flush();
    }
    recordBlocked(bytesIn) {
        this.metrics.blocked += 1;
        this.metrics.bytesIn += bytesIn;
        this.flush();
    }
    flush() {
        const report = {
            schemaVersion: '1.0',
            endpointHost: this.endpointHost,
            entryCount: this.entries.length,
            entries: this.entries,
        };
        const reportJson = stableStringify(report);
        const metricsJson = stableStringify(this.metrics);
        fs.writeFileSync(path.join(this.artifactDir, 'report.json'), reportJson + '\n');
        fs.writeFileSync(path.join(this.artifactDir, 'metrics.json'), metricsJson + '\n');
        const stamp = {
            reportSha256: sha256Hex(reportJson),
            metricsSha256: sha256Hex(metricsJson),
        };
        fs.writeFileSync(path.join(this.artifactDir, 'stamp.json'), stableStringify(stamp) + '\n');
    }
}
exports.SeraProxyEvidenceStore = SeraProxyEvidenceStore;
function sha256Hex(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
}
function stableStringify(value) {
    return JSON.stringify(sortValue(value), null, 2);
}
function sortValue(value) {
    if (Array.isArray(value)) {
        return value.map((item) => sortValue(item));
    }
    if (value && typeof value === 'object') {
        const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
        const result = {};
        for (const [key, entryValue] of entries) {
            result[key] = sortValue(entryValue);
        }
        return result;
    }
    return value;
}
