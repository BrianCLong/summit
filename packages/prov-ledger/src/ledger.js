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
exports.Ledger = void 0;
const crypto_1 = require("crypto");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class Ledger {
    config;
    evidenceStore = new Map();
    claimStore = new Map();
    transformStore = new Map();
    constructor(config) {
        this.config = config;
        if (this.config.enabled) {
            this.init();
            // In a real implementation, we would load existing data here
            // For now, we start fresh or append
        }
    }
    init() {
        if (!fs.existsSync(this.config.dataDir)) {
            fs.mkdirSync(this.config.dataDir, { recursive: true });
        }
    }
    append(filename, data) {
        if (!this.config.enabled) {
            return;
        }
        const filePath = path.join(this.config.dataDir, filename);
        fs.appendFileSync(filePath, `${JSON.stringify(data)}\n`);
    }
    registerEvidence(evidence) {
        const id = (0, crypto_1.randomUUID)();
        const timestamp = new Date().toISOString();
        // Hash complete record
        const contentToHash = JSON.stringify({
            id,
            contentHash: evidence.contentHash,
            licenseId: evidence.licenseId,
            source: evidence.source,
            transforms: evidence.transforms,
            timestamp,
            metadata: evidence.metadata
        });
        const hash = (0, crypto_1.createHash)('sha256').update(contentToHash).digest('hex');
        const record = {
            ...evidence,
            id,
            timestamp,
            hash,
        };
        this.evidenceStore.set(id, record);
        this.append('evidence.jsonl', record);
        return record;
    }
    registerTransformation(transform) {
        const id = (0, crypto_1.randomUUID)();
        const timestamp = new Date().toISOString();
        // Hash complete record
        const contentToHash = JSON.stringify({
            id,
            tool: transform.tool,
            version: transform.version,
            params: transform.params,
            inputHash: transform.inputHash,
            outputHash: transform.outputHash,
            timestamp
        });
        const hash = (0, crypto_1.createHash)('sha256').update(contentToHash).digest('hex');
        const record = {
            ...transform,
            id,
            timestamp,
            hash,
        };
        this.transformStore.set(id, record);
        this.append('transforms.jsonl', record);
        return record;
    }
    createClaim(claim) {
        const id = (0, crypto_1.randomUUID)();
        const hashContent = JSON.stringify({
            text: claim.text,
            evidenceIds: claim.evidenceIds,
            transformChainIds: claim.transformChainIds
        });
        const hash = (0, crypto_1.createHash)('sha256').update(hashContent).digest('hex');
        const record = {
            ...claim,
            id,
            timestamp: new Date().toISOString(),
            hash,
        };
        this.claimStore.set(id, record);
        this.append('claims.jsonl', record);
        return record;
    }
    getClaim(id) {
        return this.claimStore.get(id);
    }
    getEvidence(id) {
        return this.evidenceStore.get(id);
    }
    generateManifest(claimIds) {
        const claims = [];
        const evidenceSet = new Set();
        const transformSet = new Set();
        for (const id of claimIds) {
            const claim = this.claimStore.get(id);
            if (claim) {
                claims.push(claim);
                claim.evidenceIds.forEach(eid => evidenceSet.add(eid));
                claim.transformChainIds.forEach(tid => transformSet.add(tid));
            }
        }
        const evidence = [];
        evidenceSet.forEach(eid => {
            const e = this.evidenceStore.get(eid);
            if (e) {
                evidence.push(e);
            }
        });
        const transformations = [];
        transformSet.forEach(tid => {
            const t = this.transformStore.get(tid);
            if (t) {
                transformations.push(t);
            }
        });
        // Compute Merkle Root
        const allHashes = [
            ...claims.map(c => c.hash),
            ...evidence.map(e => e.hash),
            ...transformations.map(t => t.hash)
        ].sort();
        const merkleRoot = this.computeMerkleRoot(allHashes);
        const manifest = {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            generatedBy: 'prov-ledger',
            merkleRoot,
            claims,
            evidence,
            transformations,
        };
        // Stub signature
        const manifestHash = (0, crypto_1.createHash)('sha256').update(JSON.stringify(manifest)).digest('hex');
        manifest.signature = `stub-sig-${manifestHash}`;
        return manifest;
    }
    computeMerkleRoot(hashes) {
        if (hashes.length === 0) {
            return '';
        }
        let current = hashes;
        while (current.length > 1) {
            const next = [];
            for (let i = 0; i < current.length; i += 2) {
                const left = current[i];
                if (left === undefined) {
                    continue;
                }
                if (i + 1 < current.length) {
                    const right = current[i + 1];
                    if (right === undefined) {
                        next.push(left);
                        continue;
                    }
                    const combined = left + right;
                    next.push((0, crypto_1.createHash)('sha256').update(combined).digest('hex'));
                }
                else {
                    next.push(left);
                }
            }
            current = next;
        }
        return current[0] || '';
    }
}
exports.Ledger = Ledger;
