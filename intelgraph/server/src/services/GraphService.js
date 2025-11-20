const { getNeo4jDriver } = require('../config/database');
const logger = {
    error: console.error,
    warn: console.warn,
    info: console.log
};

class GraphService {
  constructor() {
    this.driver = getNeo4jDriver();
  }

  /**
   * P0: Get Investigation Graph (Golden Path)
   * Returns nodes and edges for a specific investigation or starting from a root entity.
   */
  async getInvestigationGraph(investigationId, filters = {}, limit = 1000) {
    const session = this.driver.session();
    try {
      const query = `
        MATCH (e:Entity)-[:BELONGS_TO]->(i:Investigation {id: $investigationId})
        OPTIONAL MATCH (e)-[r:RELATIONSHIP]-(e2:Entity)-[:BELONGS_TO]->(i)
        RETURN e, r, e2
        LIMIT $limit
      `;

      const result = await session.run(query, { investigationId, limit });

      const nodes = new Map();
      const edges = new Map();

      result.records.forEach(record => {
        const e = record.get('e');
        if (e) nodes.set(e.properties.id, this.formatNode(e));

        const e2 = record.get('e2');
        if (e2) nodes.set(e2.properties.id, this.formatNode(e2));

        const r = record.get('r');
        if (r) edges.set(r.properties.id, this.formatEdge(r, e.properties.id, e2.properties.id));
      });

      return {
        nodes: Array.from(nodes.values()),
        edges: Array.from(edges.values()),
        metadata: {
          nodeCount: nodes.size,
          edgeCount: edges.size,
          lastUpdated: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('Error fetching investigation graph:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * P0: Provenance - Create Decision
   */
  async createDecision({ investigationId, title, rationale, evidenceIds, userId }) {
      const session = this.driver.session();
      try {
        // Assuming Decision is a node type
        const query = `
          MATCH (i:Investigation {id: $investigationId})
          MATCH (u:User {id: $userId})
          CREATE (d:Decision {
            id: randomUUID(),
            title: $title,
            rationale: $rationale,
            createdAt: datetime(),
            status: 'PENDING'
          })
          CREATE (d)-[:BELONGS_TO]->(i)
          CREATE (d)-[:MADE_BY]->(u)
          WITH d
          UNWIND $evidenceIds as evId
          MATCH (e:Entity {id: evId})
          CREATE (d)-[:SUPPORTED_BY]->(e)
          RETURN d
        `;

        const result = await session.run(query, {
            investigationId,
            title,
            rationale,
            evidenceIds,
            userId
        });

        if (result.records.length === 0) throw new Error("Failed to create decision");
        return result.records[0].get('d').properties;

      } catch (error) {
          logger.error('Error creating decision:', error);
          throw error;
      } finally {
          await session.close();
      }
  }

   /**
   * P0: Provenance - Get Decision with Provenance
   */
   async getDecisionProvenance(decisionId) {
    const session = this.driver.session();
    try {
      const query = `
        MATCH (d:Decision {id: $decisionId})
        OPTIONAL MATCH (d)-[:SUPPORTED_BY]->(evidence)
        OPTIONAL MATCH (d)-[:MADE_BY]->(user)
        RETURN d, collect(evidence) as evidenceList, user
      `;

      const result = await session.run(query, { decisionId });
      if (result.records.length === 0) return null;

      const record = result.records[0];
      const decision = record.get('d').properties;
      const evidenceList = record.get('evidenceList').map(e => this.formatNode(e));
      const user = record.get('user') ? record.get('user').properties : null;

      return {
          ...decision,
          evidence: evidenceList,
          madeBy: user
      };

    } catch (error) {
        logger.error('Error getting decision provenance:', error);
        throw error;
    } finally {
        await session.close();
    }
}

  formatNode(node) {
    return {
      id: node.properties.id,
      label: node.labels[0], // Taking the first label
      type: node.properties.type || node.labels[0],
      properties: node.properties
    };
  }

  formatEdge(rel, sourceId, targetId) {
      return {
          id: rel.properties.id,
          source: sourceId, // Using IDs passed from query context since Neo4j driver returns internal IDs for start/end
          target: targetId,
          type: rel.type,
          properties: rel.properties
      };
  }
}

module.exports = GraphService;
