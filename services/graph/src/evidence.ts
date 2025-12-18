import { Driver, Node } from 'neo4j-driver';

/**
 * Evidence interface for IntelGraph
 */
export interface Evidence {
  id: string;
  title: string;
  description?: string;
  evidenceType: string;
  sources: any[];
  blobs: any[];
  policyLabels: any;
  context?: any;
  verification?: any;
  tags?: string[];
  properties?: any;
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Repository for storing and managing Evidence nodes in Neo4j
 */
export class EvidenceRepo {
  constructor(private driver: Driver) {}

  /**
   * Create or update an Evidence node
   */
  async upsertEvidence(evidence: Omit<Evidence, 'id' | 'createdAt' | 'updatedAt'>): Promise<Evidence> {
    const session = this.driver.session();
    try {
      const res = await session.executeWrite((tx) =>
        tx.run(
          `MERGE (e:Evidence {title: $title, evidenceType: $evidenceType})
           ON CREATE SET
             e.id = randomUUID(),
             e.createdAt = timestamp(),
             e.updatedAt = timestamp(),
             e.description = $description,
             e.sources = $sources,
             e.blobs = $blobs,
             e.policyLabels = $policyLabels,
             e.context = $context,
             e.verification = $verification,
             e.tags = $tags,
             e.properties = $properties
           ON MATCH SET
             e.updatedAt = timestamp(),
             e.description = $description,
             e.sources = $sources,
             e.blobs = $blobs,
             e.policyLabels = $policyLabels,
             e.context = $context,
             e.verification = $verification,
             e.tags = $tags,
             e.properties = $properties
           RETURN e`,
          {
            ...evidence,
            sources: JSON.stringify(evidence.sources),
            blobs: JSON.stringify(evidence.blobs),
            policyLabels: JSON.stringify(evidence.policyLabels),
            context: JSON.stringify(evidence.context || null),
            verification: JSON.stringify(evidence.verification || null),
            tags: JSON.stringify(evidence.tags || []),
            properties: JSON.stringify(evidence.properties || {}),
          },
        ),
      );
      const node = res.records[0]?.get('e');
      return node ? this.nodeToEvidence(node) : ({} as Evidence);
    } finally {
      await session.close();
    }
  }

  /**
   * Get Evidence by ID
   */
  async getEvidenceById(id: string): Promise<Evidence | null> {
    const session = this.driver.session();
    try {
      const res = await session.executeRead((tx) =>
        tx.run(`MATCH (e:Evidence {id: $id}) RETURN e`, { id }),
      );
      const node = res.records[0]?.get('e');
      return node ? this.nodeToEvidence(node) : null;
    } finally {
      await session.close();
    }
  }

  /**
   * Link Evidence to a Claim (evidence supports claim)
   */
  async linkToClaim(evidenceId: string, claimId: string, weight: number = 1.0): Promise<void> {
    const session = this.driver.session();
    try {
      await session.executeWrite((tx) =>
        tx.run(
          `MATCH (e:Evidence {id: $evidenceId}), (c:Claim {id: $claimId})
           MERGE (e)-[r:SUPPORTS]->(c)
           SET r.weight = $weight`,
          { evidenceId, claimId, weight },
        ),
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Get all Claims supported by this Evidence
   */
  async getLinkedClaims(evidenceId: string): Promise<any[]> {
    const session = this.driver.session();
    try {
      const res = await session.executeRead((tx) =>
        tx.run(
          `MATCH (e:Evidence {id: $evidenceId})-[:SUPPORTS]->(c:Claim)
           RETURN c`,
          { evidenceId },
        ),
      );
      return res.records.map((r) => this.parseJsonFields(r.get('c').properties));
    } finally {
      await session.close();
    }
  }

  /**
   * Search Evidence
   */
  async searchEvidence(
    query: string,
    filter?: any,
    limit: number = 25,
    offset: number = 0,
  ): Promise<Evidence[]> {
    const session = this.driver.session();
    try {
      let cypherQuery = `
        MATCH (e:Evidence)
        WHERE toLower(e.title) CONTAINS toLower($query)
           OR toLower(e.description) CONTAINS toLower($query)
      `;

      const params: any = { query, limit, offset };

      if (filter?.evidenceType) {
        cypherQuery += ' AND e.evidenceType IN $evidenceType';
        params.evidenceType = Array.isArray(filter.evidenceType)
          ? filter.evidenceType
          : [filter.evidenceType];
      }

      if (filter?.tags) {
        cypherQuery += ' AND ANY(tag IN $tags WHERE tag IN e.tags)';
        params.tags = Array.isArray(filter.tags) ? filter.tags : [filter.tags];
      }

      cypherQuery += `
        RETURN e
        ORDER BY e.createdAt DESC
        SKIP $offset
        LIMIT $limit
      `;

      const res = await session.executeRead((tx) => tx.run(cypherQuery, params));
      return res.records.map((r) => this.nodeToEvidence(r.get('e')));
    } finally {
      await session.close();
    }
  }

  /**
   * Get Evidence by context (e.g., case ID, investigation ID, maestro run ID)
   */
  async getByContext(contextKey: string, contextValue: string): Promise<Evidence[]> {
    const session = this.driver.session();
    try {
      const res = await session.executeRead((tx) =>
        tx.run(
          `MATCH (e:Evidence)
           WHERE e.context IS NOT NULL
           AND e.context CONTAINS $contextValue
           RETURN e`,
          { contextValue },
        ),
      );
      return res.records.map((r) => this.nodeToEvidence(r.get('e')));
    } finally {
      await session.close();
    }
  }

  /**
   * Convert Neo4j Node to Evidence
   */
  private nodeToEvidence(node: Node): Evidence {
    const props = node.properties as any;
    return this.parseJsonFields(props);
  }

  /**
   * Parse JSON string fields back to objects
   */
  private parseJsonFields(props: any): Evidence {
    return {
      id: props.id,
      title: props.title,
      description: props.description,
      evidenceType: props.evidenceType,
      sources: this.safeJsonParse(props.sources),
      blobs: this.safeJsonParse(props.blobs),
      policyLabels: this.safeJsonParse(props.policyLabels),
      context: this.safeJsonParse(props.context),
      verification: this.safeJsonParse(props.verification),
      tags: this.safeJsonParse(props.tags),
      properties: this.safeJsonParse(props.properties),
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    };
  }

  /**
   * Safely parse JSON strings
   */
  private safeJsonParse(value: any): any {
    if (value === null || value === undefined) {
      return undefined;
    }
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }
}

export default EvidenceRepo;
