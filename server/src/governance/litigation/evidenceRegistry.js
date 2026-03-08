"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceRegistry = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
class EvidenceRegistry {
    artifacts = new Map();
    pool;
    constructor(options = {}) {
        this.pool = options.pool;
    }
    async registerArtifact(input) {
        const receivedAt = new Date();
        const id = node_crypto_1.default.randomUUID();
        const hash = this.calculateHash(input, receivedAt, input.payload);
        const custodyTrail = [
            {
                artifactId: id,
                eventType: 'ingested',
                actor: input.custodian ?? 'system',
                channel: 'system',
                occurredAt: receivedAt,
                notes: 'Artifact registered in evidence registry',
                checksum: hash,
            },
        ];
        const artifact = {
            id,
            holdId: input.holdId,
            datasetId: input.datasetId,
            system: input.system,
            location: input.location,
            hash,
            receivedAt,
            custodian: input.custodian,
            notes: input.notes,
            tags: input.tags ?? [],
            custodyTrail,
        };
        this.artifacts.set(id, artifact);
        await this.persistArtifact(artifact);
        return artifact;
    }
    getArtifact(artifactId) {
        return this.artifacts.get(artifactId);
    }
    async recordCustodyEvent(event) {
        const artifact = this.artifacts.get(event.artifactId);
        if (!artifact) {
            throw new Error(`Unknown artifact ${event.artifactId}`);
        }
        artifact.custodyTrail.push(event);
        await this.persistCustodyEvent(event);
    }
    listByHold(holdId) {
        return Array.from(this.artifacts.values()).filter((artifact) => artifact.holdId === holdId);
    }
    calculateHash(input, receivedAt, payload) {
        const hash = node_crypto_1.default.createHash('sha256');
        hash.update(input.location);
        hash.update(input.system);
        hash.update(receivedAt.toISOString());
        if (payload) {
            hash.update(payload);
        }
        return hash.digest('hex');
    }
    async persistArtifact(artifact) {
        if (!this.pool)
            return;
        await this.pool.query(`INSERT INTO litigation_evidence (
        id,
        hold_id,
        dataset_id,
        system,
        location,
        hash,
        received_at,
        custodian,
        notes,
        tags,
        custody_trail
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (id) DO NOTHING`, [
            artifact.id,
            artifact.holdId ?? null,
            artifact.datasetId ?? null,
            artifact.system,
            artifact.location,
            artifact.hash,
            artifact.receivedAt,
            artifact.custodian ?? null,
            artifact.notes ?? null,
            JSON.stringify(artifact.tags ?? []),
            JSON.stringify(artifact.custodyTrail),
        ]);
    }
    async persistCustodyEvent(event) {
        if (!this.pool)
            return;
        await this.pool.query(`INSERT INTO litigation_evidence_custody (
        artifact_id,
        event_type,
        actor,
        channel,
        occurred_at,
        notes,
        checksum
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [
            event.artifactId,
            event.eventType,
            event.actor,
            event.channel,
            event.occurredAt,
            event.notes ?? null,
            event.checksum ?? null,
        ]);
    }
}
exports.EvidenceRegistry = EvidenceRegistry;
