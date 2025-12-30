import crypto from 'node:crypto';
import { EvidenceArtifact, EvidenceRegistryOptions, CustodyEvent } from './types.js';

export class EvidenceRegistry {
  private readonly artifacts = new Map<string, EvidenceArtifact>();
  private readonly pool?: EvidenceRegistryOptions['pool'];

  constructor(options: EvidenceRegistryOptions = {}) {
    this.pool = options.pool;
  }

  async registerArtifact(input: Omit<EvidenceArtifact, 'id' | 'hash' | 'receivedAt' | 'custodyTrail'> & {
    payload?: string | Buffer;
  }): Promise<EvidenceArtifact> {
    const receivedAt = new Date();
    const id = crypto.randomUUID();
    const hash = this.calculateHash(input, receivedAt, input.payload);
    const custodyTrail: CustodyEvent[] = [
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

    const artifact: EvidenceArtifact = {
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

  getArtifact(artifactId: string): EvidenceArtifact | undefined {
    return this.artifacts.get(artifactId);
  }

  async recordCustodyEvent(event: CustodyEvent): Promise<void> {
    const artifact = this.artifacts.get(event.artifactId);
    if (!artifact) {
      throw new Error(`Unknown artifact ${event.artifactId}`);
    }

    artifact.custodyTrail.push(event);
    await this.persistCustodyEvent(event);
  }

  listByHold(holdId: string): EvidenceArtifact[] {
    return Array.from(this.artifacts.values()).filter(
      (artifact) => artifact.holdId === holdId,
    );
  }

  private calculateHash(
    input: Omit<EvidenceArtifact, 'id' | 'hash' | 'receivedAt' | 'custodyTrail'> & {
      payload?: string | Buffer;
    },
    receivedAt: Date,
    payload?: string | Buffer,
  ): string {
    const hash = crypto.createHash('sha256');
    hash.update(input.location);
    hash.update(input.system);
    hash.update(receivedAt.toISOString());
    if (payload) {
      hash.update(payload);
    }
    return hash.digest('hex');
  }

  private async persistArtifact(artifact: EvidenceArtifact): Promise<void> {
    if (!this.pool) {return;}
    await this.pool.query(
      `INSERT INTO litigation_evidence (
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
      ON CONFLICT (id) DO NOTHING`,
      [
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
      ],
    );
  }

  private async persistCustodyEvent(event: CustodyEvent): Promise<void> {
    if (!this.pool) {return;}
    await this.pool.query(
      `INSERT INTO litigation_evidence_custody (
        artifact_id,
        event_type,
        actor,
        channel,
        occurred_at,
        notes,
        checksum
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        event.artifactId,
        event.eventType,
        event.actor,
        event.channel,
        event.occurredAt,
        event.notes ?? null,
        event.checksum ?? null,
      ],
    );
  }
}

