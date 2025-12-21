import { createHash } from 'crypto';
import pino from 'pino';

const log = (pino as any)({ name: 'DisclosurePackager' });

export interface EvidenceItem {
  id: string;
  content: string;
  source: string;
  timestamp: string;
}

export interface DisclosureManifest {
  version: string;
  timestamp: string;
  evidenceHashes: Record<string, string>;
  rootHash: string;
  transforms: string[];
  rightToReply: string;
}

export class DisclosurePackager {

  public createManifest(evidence: EvidenceItem[], rightToReplyUrl: string): DisclosureManifest {
    const evidenceHashes: Record<string, string> = {};
    const sortedIds = evidence.map(e => e.id).sort();

    // Calculate individual hashes
    for (const item of evidence) {
      const hash = createHash('sha256').update(item.content).digest('hex');
      evidenceHashes[item.id] = hash;
    }

    // Calculate root hash (Merkle-like)
    const rootHasher = createHash('sha256');
    for (const id of sortedIds) {
      rootHasher.update(evidenceHashes[id]);
    }
    const rootHash = rootHasher.digest('hex');

    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      evidenceHashes,
      rootHash,
      transforms: ['redaction', 'normalization'], // Placeholder for actual transforms
      rightToReply: rightToReplyUrl
    };
  }

  public verifyManifest(manifest: DisclosureManifest, evidence: EvidenceItem[]): boolean {
    const fresh = this.createManifest(evidence, manifest.rightToReply);
    return fresh.rootHash === manifest.rootHash;
  }
}
