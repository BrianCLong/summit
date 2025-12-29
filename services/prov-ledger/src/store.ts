export interface Evidence {
  id: string;
  hash: string;
  metadata?: string | null;
}

export interface Claim {
  id: string;
  evidenceIds: string[];
  statement: string;
}

export interface Manifest {
  id: string;
  merkleRoot: string;
  createdAt: string;
  claimId: string;
}

export interface LedgerEvent {
  type: 'EvidenceRegistered' | 'ClaimRegistered' | 'ManifestSealed' | 'ClaimContradiction';
  payload: Record<string, unknown>;
  timestamp: string;
}

class LedgerStore {
  private evidence = new Map<string, Evidence>();
  private claims = new Map<string, Claim>();
  private manifests = new Map<string, Manifest>();
  private events: LedgerEvent[] = [];
  private evidenceCounter = 0;
  private claimCounter = 0;

  registerEvidence(hash: string, metadata?: string | null): Evidence {
    this.evidenceCounter += 1;
    const evidence: Evidence = { id: `e${this.evidenceCounter}`, hash, metadata: metadata ?? null };
    this.evidence.set(evidence.id, evidence);
    this.events.push({ type: 'EvidenceRegistered', payload: evidence, timestamp: new Date().toISOString() });
    return evidence;
  }

  registerClaim(statement: string, evidenceIds: string[]): Claim {
    const unknown = evidenceIds.filter((id) => !this.evidence.has(id));
    if (unknown.length) {
      throw new Error(`Unknown evidence ids: ${unknown.join(',')}`);
    }
    this.claimCounter += 1;
    const claim: Claim = { id: `c${this.claimCounter}`, evidenceIds: [...new Set(evidenceIds)], statement };
    this.claims.set(claim.id, claim);
    this.events.push({ type: 'ClaimRegistered', payload: claim, timestamp: new Date().toISOString() });
    return claim;
  }

  getClaim(id: string): Claim | undefined {
    return this.claims.get(id);
  }

  listEvidence(ids: string[]): Evidence[] {
    return ids.map((id) => {
      const ev = this.evidence.get(id);
      if (!ev) {
        throw new Error(`Evidence ${id} missing`);
      }
      return ev;
    });
  }

  sealManifest(claimId: string, merkleRoot: string): Manifest {
    const claim = this.claims.get(claimId);
    if (!claim) {
      throw new Error(`Claim ${claimId} not found`);
    }
    const manifest: Manifest = {
      id: `m${this.manifests.size + 1}`,
      merkleRoot,
      createdAt: new Date().toISOString(),
      claimId,
    };
    this.manifests.set(manifest.id, manifest);
    this.events.push({ type: 'ManifestSealed', payload: manifest, timestamp: manifest.createdAt });
    return manifest;
  }

  getEvents(): LedgerEvent[] {
    return [...this.events];
  }
}

export const ledgerStore = new LedgerStore();
