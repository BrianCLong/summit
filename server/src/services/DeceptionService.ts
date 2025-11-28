import { neo } from '../db/neo4j.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export interface HoneypotConfig {
  name: string;
  type: 'SSH' | 'HTTP' | 'DATABASE' | 'FILE_SERVER';
  vulnerabilities: string[]; // e.g. ['weak_password', 'cve-2023-1234']
  location: string;
}

export interface InteractionData {
  sourceIp: string;
  payload: string;
  method?: string;
  timestamp: Date;
  metadata?: any;
}

export interface AttackerProfile {
  id: string;
  ipAddress: string;
  riskScore: number;
  techniques: string[];
  firstSeen: Date;
  lastSeen: Date;
}

export interface ThreatIntelligence {
  reportId: string;
  generatedAt: Date;
  indicators: string[];
  narrative: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export class DeceptionService {
  /**
   * Deploys a new honeypot (simulated as a node in the graph).
   */
  async deployHoneypot(config: HoneypotConfig, tenantId: string): Promise<string> {
    const id = uuidv4();
    const query = `
      CREATE (h:Honeypot:Asset {
        id: $id,
        tenantId: $tenantId,
        name: $name,
        type: $type,
        vulnerabilities: $vulnerabilities,
        location: $location,
        deployedAt: datetime(),
        status: 'ACTIVE'
      })
      RETURN h.id as id
    `;

    try {
      await neo.run(query, {
        id,
        tenantId,
        name: config.name,
        type: config.type,
        vulnerabilities: config.vulnerabilities,
        location: config.location
      });
      logger.info(`Deployed honeypot ${id} for tenant ${tenantId}`);
      return id;
    } catch (error) {
      logger.error('Error deploying honeypot:', error);
      throw error;
    }
  }

  /**
   * Logs an interaction with a honeypot.
   */
  async logInteraction(honeypotId: string, data: InteractionData, tenantId: string): Promise<string> {
    const interactionId = uuidv4();
    const query = `
      MATCH (h:Honeypot {id: $honeypotId, tenantId: $tenantId})
      CREATE (i:Interaction:Event {
        id: $interactionId,
        tenantId: $tenantId,
        sourceIp: $sourceIp,
        payload: $payload,
        method: $method,
        timestamp: datetime($timestamp),
        metadata: $metadata
      })
      CREATE (i)-[:TARGETED]->(h)
      RETURN i.id as id
    `;

    try {
      const result = await neo.run(query, {
        honeypotId,
        tenantId,
        interactionId,
        sourceIp: data.sourceIp,
        payload: data.payload,
        method: data.method || 'UNKNOWN',
        timestamp: data.timestamp.toISOString(),
        metadata: JSON.stringify(data.metadata || {})
      });

      if (result.records.length === 0) {
          throw new Error('Honeypot not found');
      }

      logger.info(`Logged interaction ${interactionId} for honeypot ${honeypotId}`);

      // Trigger profiling asynchronously
      this.profileAttacker(data.sourceIp, tenantId).catch(err =>
        logger.error(`Error profiling attacker ${data.sourceIp}:`, err)
      );

      return interactionId;
    } catch (error) {
      logger.error('Error logging interaction:', error);
      throw error;
    }
  }

  /**
   * Profiles an attacker based on their IP and interactions.
   * Updates or creates an Attacker node.
   */
  async profileAttacker(ipAddress: string, tenantId: string): Promise<AttackerProfile> {
    // 1. Find existing attacker or create new
    // 2. Aggregate interaction data to calculate risk score and identify techniques

    const query = `
      MERGE (a:Attacker {ipAddress: $ipAddress, tenantId: $tenantId})
      ON CREATE SET
        a.id = $id,
        a.firstSeen = datetime(),
        a.riskScore = 0,
        a.techniques = []
      SET a.lastSeen = datetime()
      WITH a
      MATCH (i:Interaction {sourceIp: $ipAddress, tenantId: $tenantId})
      WITH a, count(i) as interactionCount, collect(i.payload) as payloads

      // heuristic risk calculation (simple example)
      // In a real system, this would be more complex
      WITH a, interactionCount, payloads,
           CASE
             WHEN size(payloads) > 10 THEN 50
             ELSE 10
           END as baseRisk

      SET a.riskScore = baseRisk + interactionCount
      RETURN a
    `;

    const id = uuidv4();
    try {
      const result = await neo.run(query, {
        ipAddress,
        tenantId,
        id
      });

      const record = result.records[0];
      const node = record.get('a').properties;

      // Handle Neo4j DateTime objects
      const firstSeen = node.firstSeen && typeof node.firstSeen.toString === 'function'
        ? new Date(node.firstSeen.toString())
        : new Date(node.firstSeen);

      const lastSeen = node.lastSeen && typeof node.lastSeen.toString === 'function'
        ? new Date(node.lastSeen.toString())
        : new Date(node.lastSeen);

      return {
        id: node.id,
        ipAddress: node.ipAddress,
        riskScore: node.riskScore.toNumber ? node.riskScore.toNumber() : node.riskScore,
        techniques: node.techniques || [],
        firstSeen,
        lastSeen
      };
    } catch (error) {
      logger.error('Error profiling attacker:', error);
      throw error;
    }
  }

  /**
   * Generates threat intelligence report based on recent honeypot activity.
   */
  async generateThreatIntelligence(tenantId: string): Promise<ThreatIntelligence> {
    // Aggregates data from honeypots and attackers to form a report
    const query = `
      MATCH (h:Honeypot {tenantId: $tenantId})<-[:TARGETED]-(i:Interaction)
      WHERE i.timestamp > datetime() - duration({days: 1})
      WITH h, count(i) as hits, collect(distinct i.sourceIp) as attackers
      RETURN sum(hits) as totalHits, count(distinct h) as activeHoneypots,
             collect(distinct attackers) as uniqueAttackers
    `;

    try {
      const result = await neo.run(query, { tenantId });

      if (result.records.length === 0) {
          return {
              reportId: uuidv4(),
              generatedAt: new Date(),
              indicators: [],
              narrative: "No recent activity detected.",
              severity: 'LOW'
          };
      }

      const record = result.records[0];
      const totalHits = record.get('totalHits').toNumber ? record.get('totalHits').toNumber() : record.get('totalHits');
      const activeHoneypots = record.get('activeHoneypots').toNumber ? record.get('activeHoneypots').toNumber() : record.get('activeHoneypots');
      // uniqueAttackers is a list of lists, need to flatten
      const attackersList = record.get('uniqueAttackers').flat();
      const uniqueAttackerCount = new Set(attackersList).size;

      let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
      if (totalHits > 100) severity = 'CRITICAL';
      else if (totalHits > 50) severity = 'HIGH';
      else if (totalHits > 10) severity = 'MEDIUM';

      return {
        reportId: uuidv4(),
        generatedAt: new Date(),
        indicators: attackersList, // List of IPs
        narrative: `Deception grid active. Monitoring ${activeHoneypots} honeypots. Detected ${totalHits} interactions from ${uniqueAttackerCount} unique sources in the last 24 hours.`,
        severity
      };

    } catch (error) {
      logger.error('Error generating threat intelligence:', error);
      throw error;
    }
  }
}
