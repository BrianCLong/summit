// ===================================
// server/src/services/GraphAnalysisService.js - AI Analytics Engine
// ===================================
const { getNeo4jDriver } = require('../config/database');
// const logger = require('../utils/logger');
const logger = {
    error: console.error,
    warn: console.warn,
    info: console.log
};

class GraphAnalysisService {
  constructor() {
    this.driver = getNeo4jDriver();
  }

  /**
   * Calculate graph metrics and centrality scores
   */
  async calculateGraphMetrics(investigationId) {
    const session = this.driver.session();

    try {
      // Get basic metrics
      const metricsQuery = `
        MATCH (e:Entity)-[:BELONGS_TO]->(i:Investigation {id: $investigationId})
        OPTIONAL MATCH (e)-[r:RELATIONSHIP]-(e2:Entity)-[:BELONGS_TO]->(i)
        RETURN
          count(DISTINCT e) as nodeCount,
          count(DISTINCT r) as edgeCount
      `;

      const metricsResult = await session.run(metricsQuery, {
        investigationId,
      });
      const metrics = metricsResult.records[0].toObject();

      // Calculate density
      const nodeCount = metrics.nodeCount.toNumber();
      const edgeCount = metrics.edgeCount.toNumber();
      const maxEdges = (nodeCount * (nodeCount - 1)) / 2;
      const density = maxEdges > 0 ? edgeCount / maxEdges : 0;
      const averageDegree = nodeCount > 0 ? (2 * edgeCount) / nodeCount : 0;

      // Calculate centrality scores
      const centralityScores =
        await this.calculateCentralityScores(investigationId);

      // Detect clusters
      const clusters = await this.detectCommunities(investigationId);

      return {
        nodeCount,
        edgeCount,
        density,
        averageDegree,
        centralityScores,
        clusters,
      };
    } catch (error) {
      logger.error('Error calculating graph metrics:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Calculate centrality scores for entities
   */
  async calculateCentralityScores(investigationId) {
    const session = this.driver.session();

    try {
      // Calculate degree centrality
      const degreeQuery = `
        MATCH (e:Entity)-[:BELONGS_TO]->(i:Investigation {id: $investigationId})
        OPTIONAL MATCH (e)-[r:RELATIONSHIP]-(e2:Entity)-[:BELONGS_TO]->(i)
        RETURN
          e.id as entityId,
          count(r) as degree
        ORDER BY degree DESC
      `;

      const degreeResult = await session.run(degreeQuery, { investigationId });
      const centralityScores = degreeResult.records.map((record) => ({
        entityId: record.get('entityId'),
        degree: record.get('degree').toNumber(),
        betweenness: 0, // Placeholder - would need more complex calculation
        closeness: 0, // Placeholder - would need more complex calculation
        pagerank: 0, // Placeholder - would need PageRank algorithm
      }));

      // For demo purposes, we'll simulate betweenness and PageRank scores
      centralityScores.forEach((score) => {
        score.betweenness = Math.random() * score.degree;
        score.closeness = Math.random();
        score.pagerank = Math.random() * 0.1;
      });

      return centralityScores;
    } catch (error) {
      logger.error('Error calculating centrality scores:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Detect communities/clusters in the graph
   */
  async detectCommunities(investigationId) {
    const session = this.driver.session();

    try {
      // Simple clustering based on connection patterns
      const clusterQuery = `
        MATCH (e:Entity)-[:BELONGS_TO]->(i:Investigation {id: $investigationId})
        OPTIONAL MATCH (e)-[r:RELATIONSHIP]-(e2:Entity)-[:BELONGS_TO]->(i)
        WITH e, count(r) as connections, collect(e2) as neighbors
        RETURN
          e.id as entityId,
          e.type as entityType,
          connections,
          neighbors
      `;

      const clusterResult = await session.run(clusterQuery, {
        investigationId,
      });

      // Simple clustering algorithm - group by entity type and high connectivity
      const clusters = new Map();
      const entities = clusterResult.records.map((record) => ({
        entityId: record.get('entityId'),
        entityType: record.get('entityType'),
        connections: record.get('connections').toNumber(),
      }));

      entities.forEach((entity) => {
        const clusterKey =
          entity.connections > 3 ? 'high_connectivity' : entity.entityType;

        if (!clusters.has(clusterKey)) {
          clusters.set(clusterKey, {
            id: clusterKey,
            entities: [],
            size: 0,
            cohesion: 0,
          });
        }

        clusters.get(clusterKey).entities.push(entity.entityId);
        clusters.get(clusterKey).size++;
      });

      // Calculate cohesion scores
      clusters.forEach((cluster) => {
        cluster.cohesion = Math.random() * 0.5 + 0.5; // Simulated cohesion score
      });

      return Array.from(clusters.values());
    } catch (error) {
      logger.error('Error detecting communities:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Predict potential links between entities
   */
  async predictLinks(investigationId, limit = 10) {
    const session = this.driver.session();

    try {
      // Find entities that are not directly connected but have common neighbors
      const linkPredictionQuery = `
        MATCH (e1:Entity)-[:BELONGS_TO]->(i:Investigation {id: $investigationId})
        MATCH (e2:Entity)-[:BELONGS_TO]->(i)
        WHERE e1.id < e2.id

        // Check if they're not already connected
        OPTIONAL MATCH (e1)-[existing:RELATIONSHIP]-(e2)
        WHERE existing IS NULL

        // Find common neighbors
        MATCH (e1)-[:RELATIONSHIP]-(common)-[:RELATIONSHIP]-(e2)

        WITH e1, e2, count(common) as commonNeighbors
        WHERE commonNeighbors > 0

        RETURN
          e1.id as sourceEntityId,
          e2.id as targetEntityId,
          e1.type as sourceType,
          e2.type as targetType,
          commonNeighbors
        ORDER BY commonNeighbors DESC
        LIMIT $limit
      `;

      const result = await session.run(linkPredictionQuery, {
        investigationId,
        limit,
      });

      return result.records.map((record) => {
        const sourceType = record.get('sourceType');
        const targetType = record.get('targetType');
        const commonNeighbors = record.get('commonNeighbors').toNumber();

        // Predict relationship type based on entity types and patterns
        const predictedType = this.predictRelationshipType(
          sourceType,
          targetType,
        );
        const confidence = Math.min(0.9, commonNeighbors * 0.2 + 0.1);

        return {
          sourceEntityId: record.get('sourceEntityId'),
          targetEntityId: record.get('targetEntityId'),
          predictedRelationshipType: predictedType,
          confidence,
          reasoning: `${commonNeighbors} common connections suggest potential relationship`,
        };
      });
    } catch (error) {
      logger.error('Error predicting links:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Detect anomalies in the graph
   */
  async detectAnomalies(investigationId) {
    const session = this.driver.session();

    try {
      const anomalies = [];

      // Detect entities with unusually high connectivity
      const highConnectivityQuery = `
        MATCH (e:Entity)-[:BELONGS_TO]->(i:Investigation {id: $investigationId})
        OPTIONAL MATCH (e)-[r:RELATIONSHIP]-(connected)
        WITH e, count(r) as connections
        WHERE connections > 10
        RETURN e.id as entityId, connections
        ORDER BY connections DESC
        LIMIT 5
      `;

      const highConnResult = await session.run(highConnectivityQuery, {
        investigationId,
      });

      highConnResult.records.forEach((record) => {
        const connections = record.get('connections').toNumber();
        anomalies.push({
          entityId: record.get('entityId'),
          anomalyType: 'HIGH_CONNECTIVITY',
          severity: Math.min(1.0, connections / 20),
          description: `Entity has unusually high connectivity (${connections} connections)`,
          evidence: [`${connections} direct connections`],
        });
      });

      // Detect isolated entities
      const isolatedQuery = `
        MATCH (e:Entity)-[:BELONGS_TO]->(i:Investigation {id: $investigationId})
        OPTIONAL MATCH (e)-[r:RELATIONSHIP]-(connected)
        WITH e, count(r) as connections
        WHERE connections = 0
        RETURN e.id as entityId, e.label as label
        LIMIT 10
      `;

      const isolatedResult = await session.run(isolatedQuery, {
        investigationId,
      });

      isolatedResult.records.forEach((record) => {
        anomalies.push({
          entityId: record.get('entityId'),
          anomalyType: 'ISOLATED_ENTITY',
          severity: 0.6,
          description: 'Entity has no connections to other entities',
          evidence: ['Zero connections', 'Potential data quality issue'],
        });
      });

      // Detect entities with unusual property patterns
      const propertyAnomalyQuery = `
        MATCH (e:Entity)-[:BELONGS_TO]->(i:Investigation {id: $investigationId})
        WHERE size(keys(e.properties)) = 0 OR e.label IS NULL OR e.label = ""
        RETURN e.id as entityId, e.label as label, e.properties as properties
        LIMIT 10
      `;

      const propertyResult = await session.run(propertyAnomalyQuery, {
        investigationId,
      });

      propertyResult.records.forEach((record) => {
        anomalies.push({
          entityId: record.get('entityId'),
          anomalyType: 'INCOMPLETE_DATA',
          severity: 0.4,
          description: 'Entity has missing or incomplete data',
          evidence: ['Missing label or properties'],
        });
      });

      return anomalies;
    } catch (error) {
      logger.error('Error detecting anomalies:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Extract entities from text using simple NLP patterns
   */
  async extractEntitiesFromText(text) {
    // Simple entity extraction patterns
    const patterns = {
      EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      PHONE:
        /\b(?:\+?1[-.\s]?)?\(?[2-9][0-8][0-9]\)?[-.\s]?[2-9][0-9]{2}[-.\s]?[0-9]{4}\b/g,
      IP_ADDRESS: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
      URL: /https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w/_.])*(?:\?(?:[\w&=%.])*)?(?:\#(?:[\w.])*)?)?/g,
      // Add more patterns for organizations, locations, etc.
    };

    const extractedEntities = [];

    Object.entries(patterns).forEach(([type, pattern]) => {
      const matches = text.match(pattern) || [];
      matches.forEach((match) => {
        extractedEntities.push({
          type,
          label: match,
          confidence: 0.8,
          properties: { extractedFrom: 'text' },
        });
      });
    });

    // Simple person name extraction (very basic)
    const namePattern = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g;
    const nameMatches = text.match(namePattern) || [];
    nameMatches.forEach((match) => {
      extractedEntities.push({
        type: 'PERSON',
        label: match,
        confidence: 0.6,
        properties: { extractedFrom: 'text' },
      });
    });

    return extractedEntities;
  }

  /**
   * Predict relationship type based on entity types
   */
  predictRelationshipType(sourceType, targetType) {
    const typeMap = {
      PERSON_ORGANIZATION: 'WORKS_FOR',
      PERSON_LOCATION: 'LOCATED_AT',
      PERSON_PERSON: 'KNOWS',
      ORGANIZATION_LOCATION: 'LOCATED_AT',
      PERSON_PHONE: 'OWNS',
      PERSON_EMAIL: 'OWNS',
      ORGANIZATION_DOCUMENT: 'OWNS',
    };

    const key = `${sourceType}_${targetType}`;
    const reverseKey = `${targetType}_${sourceType}`;

    return typeMap[key] || typeMap[reverseKey] || 'RELATED_TO';
  }
}

module.exports = GraphAnalysisService;
