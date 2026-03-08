"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ledger = exports.AppendOnlyLedger = void 0;
// @ts-nocheck
const crypto_1 = require("crypto");
const canonical_js_1 = require("./canonical.js");
const merkle_js_1 = require("./merkle.js");
class AppendOnlyLedger {
    log = [];
    evidenceMap = new Map();
    claimMap = new Map();
    edges = [];
    secret;
    constructor(secret = process.env.LEDGER_SECRET || 'prov-ledger-secret') {
        this.secret = secret;
    }
    currentTailHash() {
        return this.log.length ? this.log[this.log.length - 1].hash : '';
    }
    append(type, payload) {
        const prevHash = this.currentTailHash();
        const hash = (0, canonical_js_1.sha256)({ prevHash, payload });
        const signature = (0, canonical_js_1.hmacSha256)(this.secret, { hash, prevHash });
        const entry = {
            index: this.log.length,
            type,
            hash,
            prevHash,
            signature,
            timestamp: new Date().toISOString(),
            payload,
        };
        this.log.push(entry);
        return entry;
    }
    addEvidence(input) {
        const contentHash = (0, canonical_js_1.sha256)(input.content);
        const id = `evidence_${(0, crypto_1.randomUUID)()}`;
        const receivedAt = new Date().toISOString();
        const record = {
            id,
            contentHash,
            recordHash: '',
            mediaType: input.mediaType,
            attributes: input.attributes,
            receivedAt,
            signature: '',
            prevHash: this.currentTailHash(),
        };
        const recordHash = (0, canonical_js_1.sha256)({ id, contentHash, mediaType: input.mediaType, attributes: input.attributes, receivedAt });
        record.recordHash = recordHash;
        record.signature = (0, canonical_js_1.hmacSha256)(this.secret, { hash: recordHash, prevHash: record.prevHash });
        this.append('evidence', record);
        this.evidenceMap.set(id, record);
        return record;
    }
    addClaim(input) {
        for (const id of input.evidenceIds) {
            if (!this.evidenceMap.has(id)) {
                throw new Error(`Unknown evidence id ${id}`);
            }
        }
        const id = `claim_${(0, crypto_1.randomUUID)()}`;
        const issuedAt = new Date().toISOString();
        const assertionHash = (0, canonical_js_1.sha256)(input.assertion);
        const claim = {
            id,
            assertionHash,
            recordHash: '',
            evidenceIds: [...input.evidenceIds],
            actor: input.actor,
            issuedAt,
            signature: '',
            prevHash: this.currentTailHash(),
        };
        const claimHash = (0, canonical_js_1.sha256)({ id, assertionHash, evidenceIds: claim.evidenceIds, actor: claim.actor, issuedAt });
        claim.recordHash = claimHash;
        claim.signature = (0, canonical_js_1.hmacSha256)(this.secret, { hash: claimHash, prevHash: claim.prevHash });
        this.append('claim', claim);
        this.claimMap.set(id, claim);
        // link edges evidence -> claim
        for (const evidenceId of claim.evidenceIds) {
            const edgeId = `edge_${(0, crypto_1.randomUUID)()}`;
            const createdAt = new Date().toISOString();
            const edge = {
                id: edgeId,
                from: evidenceId,
                to: id,
                kind: 'supports',
                createdAt,
                recordHash: '',
                signature: '',
                prevHash: this.currentTailHash(),
            };
            const edgeHash = (0, canonical_js_1.sha256)({ id: edgeId, from: evidenceId, to: id, kind: edge.kind, createdAt });
            edge.recordHash = edgeHash;
            edge.signature = (0, canonical_js_1.hmacSha256)(this.secret, { hash: edgeHash, prevHash: edge.prevHash });
            this.append('edge', edge);
            this.edges.push(edge);
        }
        return claim;
    }
    getManifest(claimId) {
        const claim = this.claimMap.get(claimId);
        if (!claim) {
            throw new Error('Claim not found');
        }
        const evidence = claim.evidenceIds.map((id) => this.evidenceMap.get(id)).filter(Boolean);
        const adjacency = this.edges
            .filter((edge) => edge.to === claimId)
            .map((edge) => ({ from: edge.from, to: edge.to, kind: edge.kind, signature: edge.signature, prevHash: edge.prevHash, recordHash: edge.recordHash }));
        const leaves = [
            ...evidence.map((ev) => ({ id: ev.id, type: 'evidence', hash: ev.recordHash, signature: ev.signature, prevHash: ev.prevHash })),
            { id: claim.id, type: 'claim', hash: claim.recordHash, signature: claim.signature, prevHash: claim.prevHash },
            ...adjacency.map((edge) => ({ id: `${edge.from}->${edge.to}`, type: 'edge', hash: edge.recordHash || '', signature: edge.signature, prevHash: edge.prevHash })),
        ];
        const tree = (0, merkle_js_1.buildMerkleTree)(leaves);
        const manifestSignature = (0, canonical_js_1.hmacSha256)(this.secret, { root: tree.root, claimId });
        return {
            schemaVersion: '1.0',
            claimId,
            merkleRoot: tree.root,
            tree,
            adjacency,
            leaves,
            manifestSignature,
            generatedAt: new Date().toISOString(),
        };
    }
    verifyManifest(manifest) {
        const reasons = [];
        // recompute root
        const recomputed = (0, merkle_js_1.buildMerkleTree)(manifest.leaves);
        if (recomputed.root !== manifest.merkleRoot) {
            reasons.push('merkle root mismatch');
        }
        // check signatures per leaf
        for (const leaf of manifest.leaves) {
            const derivedSignature = (0, canonical_js_1.hmacSha256)(this.secret, { hash: leaf.hash, prevHash: leaf.prevHash || '' });
            if (leaf.signature && leaf.signature !== derivedSignature) {
                reasons.push(`signature mismatch for ${leaf.type}:${leaf.id}`);
            }
        }
        // manifest signature validation
        const expectedManifestSignature = (0, canonical_js_1.hmacSha256)(this.secret, { root: manifest.merkleRoot, claimId: manifest.claimId });
        if (manifest.manifestSignature !== expectedManifestSignature) {
            reasons.push('manifest signature invalid');
        }
        // adjacency validation
        const leafIds = new Set(manifest.leaves.map((l) => l.id));
        for (const edge of manifest.adjacency) {
            if (!leafIds.has(edge.from)) {
                reasons.push(`missing source leaf for ${edge.from}`);
            }
            if (!leafIds.has(edge.to)) {
                reasons.push(`missing target leaf for ${edge.to}`);
            }
            const expectedEdgeSignature = (0, canonical_js_1.hmacSha256)(this.secret, {
                hash: edge.recordHash || (0, canonical_js_1.sha256)({ from: edge.from, to: edge.to, kind: edge.kind }),
                prevHash: edge.prevHash || '',
            });
            if (edge.signature && edge.signature !== expectedEdgeSignature) {
                reasons.push(`edge signature mismatch ${edge.from}->${edge.to}`);
            }
        }
        return {
            valid: reasons.length === 0,
            reasons,
        };
    }
    exportManifest(claimId) {
        const manifest = this.getManifest(claimId);
        return { manifest, serialized: (0, canonical_js_1.canonicalStringify)(manifest) };
    }
    getLog() {
        return [...this.log];
    }
}
exports.AppendOnlyLedger = AppendOnlyLedger;
exports.ledger = new AppendOnlyLedger();
