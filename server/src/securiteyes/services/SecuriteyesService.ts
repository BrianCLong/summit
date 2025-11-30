import { runCypher } from '../../graph/neo4j.js';
import {
  NODE_LABELS,
  RELATIONSHIPS,
  ThreatActor,
  Campaign,
  Indicator,
  SuspiciousEvent,
  Incident,
  DeceptionAsset,
  InsiderRiskProfile
} from '../models/types.js';
import { randomUUID } from 'crypto';

export class SecuriteyesService {
  private static instance: SecuriteyesService;

  private constructor() {}

  public static getInstance(): SecuriteyesService {
    if (!SecuriteyesService.instance) {
      SecuriteyesService.instance = new SecuriteyesService();
    }
    return SecuriteyesService.instance;
  }

  // --- Generic Node Creation ---
  async createNode<T>(label: string, data: Partial<T> & { tenantId: string }): Promise<T> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const props = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    const query = `
      CREATE (n:${label} $props)
      RETURN n
    `;

    const result = await runCypher(query, { props });
    if (!result || result.length === 0) {
      throw new Error(`Failed to create node of label ${label}`);
    }
    return result[0].n.properties as T;
  }

  // --- Generic Edge Creation ---
  async createRelationship(
    fromId: string,
    toId: string,
    relationshipType: string,
    props: Record<string, any> = {}
  ): Promise<void> {
    // Assuming generic matching on IDs across all labels for simplicity,
    // but in practice might want to specify labels for performance.
    const query = `
      MATCH (a), (b)
      WHERE a.id = $fromId AND b.id = $toId
      MERGE (a)-[r:${relationshipType}]->(b)
      SET r += $props, r.createdAt = datetime()
      RETURN r
    `;
    await runCypher(query, { fromId, toId, props });
  }

  // --- Specific Entity Methods ---

  async createSuspiciousEvent(data: Partial<SuspiciousEvent> & { tenantId: string }): Promise<SuspiciousEvent> {
    return this.createNode<SuspiciousEvent>(NODE_LABELS.SUSPICIOUS_EVENT, data);
  }

  async createIndicator(data: Partial<Indicator> & { tenantId: string }): Promise<Indicator> {
    // Check if indicator exists first to avoid duplicates
    const checkQuery = `
      MATCH (n:${NODE_LABELS.INDICATOR} { value: $value, tenantId: $tenantId })
      RETURN n
    `;
    const existing = await runCypher(checkQuery, { value: data.value, tenantId: data.tenantId });
    if (existing.length > 0) {
      return existing[0].n.properties as Indicator;
    }
    return this.createNode<Indicator>(NODE_LABELS.INDICATOR, data);
  }

  async createCampaign(data: Partial<Campaign> & { tenantId: string }): Promise<Campaign> {
    return this.createNode<Campaign>(NODE_LABELS.CAMPAIGN, data);
  }

  async createThreatActor(data: Partial<ThreatActor> & { tenantId: string }): Promise<ThreatActor> {
    return this.createNode<ThreatActor>(NODE_LABELS.THREAT_ACTOR, data);
  }

  async createIncident(data: Partial<Incident> & { tenantId: string }): Promise<Incident> {
    return this.createNode<Incident>(NODE_LABELS.INCIDENT, data);
  }

  async createDeceptionAsset(data: Partial<DeceptionAsset> & { tenantId: string }): Promise<DeceptionAsset> {
    return this.createNode<DeceptionAsset>(NODE_LABELS.DECEPTION_ASSET, data);
  }

  // --- Risk Profile ---
  async getOrCreateRiskProfile(principalId: string, tenantId: string): Promise<InsiderRiskProfile> {
    const query = `
      MERGE (n:${NODE_LABELS.INSIDER_RISK_PROFILE} { principalId: $principalId, tenantId: $tenantId })
      ON CREATE SET
        n.id = $id,
        n.createdAt = datetime(),
        n.updatedAt = datetime(),
        n.riskScore = 0,
        n.riskFactors = '{}'
      RETURN n
    `;
    const result = await runCypher(query, { principalId, tenantId, id: randomUUID() });
    const profile = result[0].n.properties;
    // Parse riskFactors if it comes back as string (depending on Neo4j driver serialization)
    if (typeof profile.riskFactors === 'string') {
        profile.riskFactors = JSON.parse(profile.riskFactors);
    }
    return profile as InsiderRiskProfile;
  }

  async updateRiskScore(principalId: string, tenantId: string, score: number, factors: Record<string, any>): Promise<void> {
    const query = `
      MATCH (n:${NODE_LABELS.INSIDER_RISK_PROFILE} { principalId: $principalId, tenantId: $tenantId })
      SET n.riskScore = $score, n.riskFactors = $factors, n.updatedAt = datetime()
    `;
    // Serialize factors for Neo4j if complex object
    await runCypher(query, { principalId, tenantId, score, factors: JSON.stringify(factors) });
  }

  // --- Retrieval & Search ---

  async getRecentSuspiciousEvents(tenantId: string, limit: number = 50): Promise<SuspiciousEvent[]> {
    const query = `
      MATCH (n:${NODE_LABELS.SUSPICIOUS_EVENT} { tenantId: $tenantId })
      RETURN n
      ORDER BY n.createdAt DESC
      LIMIT toInteger($limit)
    `;
    const res = await runCypher(query, { tenantId, limit });
    return res.map(r => r.n.properties);
  }

  async getActiveIncidents(tenantId: string): Promise<Incident[]> {
    const query = `
      MATCH (n:${NODE_LABELS.INCIDENT} { tenantId: $tenantId })
      WHERE n.status <> 'recovered' AND n.status <> 'lessons_learned'
      RETURN n
      ORDER BY n.createdAt DESC
    `;
    const res = await runCypher(query, { tenantId });
    return res.map(r => r.n.properties);
  }

  async getCampaigns(tenantId: string): Promise<Campaign[]> {
      const query = `
        MATCH (n:${NODE_LABELS.CAMPAIGN} { tenantId: $tenantId })
        RETURN n
        ORDER BY n.updatedAt DESC
      `;
      const res = await runCypher(query, { tenantId });
      return res.map(r => r.n.properties);
  }

  async getThreatActors(tenantId: string): Promise<ThreatActor[]> {
      const query = `
        MATCH (n:${NODE_LABELS.THREAT_ACTOR} { tenantId: $tenantId })
        RETURN n
        ORDER BY n.confidence DESC
      `;
      const res = await runCypher(query, { tenantId });
      return res.map(r => r.n.properties);
  }

  async getHighRiskProfiles(tenantId: string, threshold: number): Promise<InsiderRiskProfile[]> {
      const query = `
          MATCH (n:${NODE_LABELS.INSIDER_RISK_PROFILE} { tenantId: $tenantId })
          WHERE n.riskScore >= $threshold
          RETURN n
          ORDER BY n.riskScore DESC
      `;
      const res = await runCypher(query, { tenantId, threshold });
      return res.map((r: any) => {
          const profile = r.n.properties;
           if (typeof profile.riskFactors === 'string') {
              try { profile.riskFactors = JSON.parse(profile.riskFactors); } catch {}
          }
          return profile as InsiderRiskProfile;
      });
  }
}
