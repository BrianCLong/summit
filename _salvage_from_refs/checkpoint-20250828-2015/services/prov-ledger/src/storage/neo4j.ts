export type Evidence = {
  id: string;
  checksum: string;
  algorithm: string;
  source: string;
  license: string;
  confidence?: number;
  transforms?: any[];
  labels?: { sensitivity?: string; legalBasis?: string; licenseClass?: string };
  blobKey?: string;
};

export type Claim = { id: string; statement: string; evidenceIds: string[] };

export interface EvidenceStore {
  createEvidence(e: Evidence): Promise<void>;
  getEvidenceByIds(ids: string[]): Promise<Evidence[]>;
  getEvidenceByCase(caseId: string): Promise<Evidence[]>; // placeholder
}
export interface ClaimStore {
  createClaim(c: Claim): Promise<void>;
}

export class InMemoryEvidenceStore implements EvidenceStore, ClaimStore {
  private evidences = new Map<string, Evidence>();
  private claims = new Map<string, Claim>();

  async createEvidence(e: Evidence): Promise<void> {
    this.evidences.set(e.id, e);
  }
  async createClaim(c: Claim): Promise<void> {
    this.claims.set(c.id, c);
  }
  async getEvidenceByIds(ids: string[]): Promise<Evidence[]> {
    return ids.map(id => this.evidences.get(id)).filter(Boolean) as Evidence[];
  }
  async getEvidenceByCase(_caseId: string): Promise<Evidence[]> {
    // beta: return all evidences for now
    return Array.from(this.evidences.values());
  }
}

// Neo4j-backed store (beta wiring)
// Requires env: NEO4J_URL, NEO4J_USER, NEO4J_PASSWORD
export class Neo4jEvidenceStore implements EvidenceStore, ClaimStore {
  private driver: any;
  constructor(driver: any) {
    this.driver = driver;
  }

  async createEvidence(e: Evidence): Promise<void> {
    const session = this.driver.session();
    try {
      const labels = e.labels || {};
      await session.run(
        `MERGE (ev:Evidence {id:$id})
         SET ev.checksum=$checksum, ev.algorithm=$algorithm, ev.source=$source,
             ev.license=$license, ev.confidence=$confidence, ev.labels=$labels,
             ev.transforms=$transforms, ev.createdAt=coalesce(ev.createdAt, datetime()), ev.updatedAt=datetime()`,
        { id: e.id, checksum: e.checksum, algorithm: e.algorithm, source: e.source, license: e.license, confidence: e.confidence || null, labels, transforms: e.transforms || [] }
      );
    } finally {
      await session.close();
    }
  }

  async createClaim(c: Claim): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(
        `MERGE (cl:Claim {id:$id}) SET cl.statement=$statement, cl.createdAt=coalesce(cl.createdAt, datetime()), cl.updatedAt=datetime();`,
        { id: c.id, statement: c.statement }
      );
      if (Array.isArray(c.evidenceIds)) {
        for (const eid of c.evidenceIds) {
          await session.run(
            `MATCH (cl:Claim {id:$cid}),(ev:Evidence {id:$eid})
             MERGE (cl)-[:SUPPORTS]->(ev)`,
            { cid: c.id, eid }
          );
        }
      }
    } finally {
      await session.close();
    }
  }

  async getEvidenceByIds(ids: string[]): Promise<Evidence[]> {
    if (!ids.length) return [];
    const session = this.driver.session();
    try {
      const res = await session.run(`MATCH (ev:Evidence) WHERE ev.id IN $ids RETURN ev`, { ids });
      return res.records.map((r: any) => r.get('ev').properties as Evidence);
    } finally {
      await session.close();
    }
  }

  async getEvidenceByCase(_caseId: string): Promise<Evidence[]> {
    // Beta: return recent N evidences (or by tag once modeled)
    const session = this.driver.session();
    try {
      const res = await session.run(`MATCH (ev:Evidence) RETURN ev ORDER BY ev.createdAt DESC LIMIT 100`);
      return res.records.map((r: any) => r.get('ev').properties as Evidence);
    } finally {
      await session.close();
    }
  }
}
