import { Driver, Node } from 'neo4j-driver';

/**
 * Repository for storing and relating claim nodes in Neo4j.
 */
export interface Claim {
  id: string;
  caseId: string;
  text: string;
  confidence?: number;
  createdAt?: number;
}

export class ClaimRepo {
  constructor(private driver: Driver) {}

  /**
   * Create or update a claim and link supporting evidence.
   * @param caseId identifier for the investigation case
   * @param text textual content of the claim
   * @param confidence confidence score for the claim
   * @param sourceEvidenceIds list of evidence node ids supporting the claim
   * @returns the created or updated claim node
   */
  async upsertClaim(
    caseId: string,
    text: string,
    confidence: number,
    sourceEvidenceIds: string[],
  ): Promise<Claim | undefined> {
    const session = this.driver.session();
    try {
      const res = await session.executeWrite((tx) =>
        tx.run(
          `MERGE (c:Claim {text:$text, caseId:$caseId})
           ON CREATE SET c.id=randomUUID(), c.createdAt=timestamp(), c.confidence=$confidence
           WITH c
           UNWIND $eids as eid
           MATCH (e:Evidence {id:eid})
           MERGE (e)-[:SUPPORTS]->(c)
           RETURN c`,
          { caseId, text, confidence, eids: sourceEvidenceIds },
        ),
      );
      const node = res.records[0]?.get('c');
      return node ? this.nodeToClaim(node) : undefined;
    } finally {
      await session.close();
    }
  }

  async getClaimById(id: string): Promise<Claim | null> {
    const session = this.driver.session();
    try {
      const res = await session.executeRead((tx) =>
        tx.run(`MATCH (c:Claim {id:$id}) RETURN c`, { id }),
      );
      const node = res.records[0]?.get('c');
      return node ? this.nodeToClaim(node) : null;
    } finally {
      await session.close();
    }
  }

  async getClaimsForCase(caseId: string): Promise<Claim[]> {
    const session = this.driver.session();
    try {
      const res = await session.executeRead((tx) =>
        tx.run(`MATCH (c:Claim {caseId:$caseId}) RETURN c`, { caseId }),
      );
      return res.records.map((r) => this.nodeToClaim(r.get('c')));
    } finally {
      await session.close();
    }
  }

  /**
   * Create a CONTRADICTS relationship between two claims by their ids.
   */
  async linkContradictionById(
    claimIdA: string,
    claimIdB: string,
  ): Promise<void> {
    const session = this.driver.session();
    try {
      await session.executeWrite((tx) =>
        tx.run(
          `MATCH (a:Claim {id:$a}), (b:Claim {id:$b}) MERGE (a)-[:CONTRADICTS]->(b)`,
          {
            a: claimIdA,
            b: claimIdB,
          },
        ),
      );
    } finally {
      await session.close();
    }
  }

  async unlinkContradictionById(
    claimIdA: string,
    claimIdB: string,
  ): Promise<void> {
    const session = this.driver.session();
    try {
      await session.executeWrite((tx) =>
        tx.run(
          `MATCH (a:Claim {id:$a})-[r:CONTRADICTS]->(b:Claim {id:$b}) DELETE r`,
          {
            a: claimIdA,
            b: claimIdB,
          },
        ),
      );
    } finally {
      await session.close();
    }
  }

  async findContradictions(claimId: string): Promise<Claim[]> {
    const session = this.driver.session();
    try {
      const res = await session.executeRead((tx) =>
        tx.run(`MATCH (:Claim {id:$id})-[:CONTRADICTS]->(c:Claim) RETURN c`, {
          id: claimId,
        }),
      );
      return res.records.map((r) => this.nodeToClaim(r.get('c')));
    } finally {
      await session.close();
    }
  }

  private nodeToClaim(node: Node): Claim {
    const props = node.properties as any;
    return {
      id: props.id,
      caseId: props.caseId,
      text: props.text,
      confidence: props.confidence,
      createdAt: props.createdAt,
    };
  }
}

export default ClaimRepo;
