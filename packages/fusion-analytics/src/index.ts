/**
 * Multi-Domain Intelligence Fusion Analytics
 *
 * Cross-domain correlation, entity resolution, and unified threat picture
 */

import { z } from 'zod';

export const IntelligenceDomainSchema = z.enum([
  'SIGINT', 'HUMINT', 'OSINT', 'GEOINT', 'MASINT', 'TECHINT',
  'CYBER', 'FININT', 'SOCMINT', 'DARKWEB', 'SUPPLY_CHAIN'
]);

export type IntelligenceDomain = z.infer<typeof IntelligenceDomainSchema>;

export const IntelReportSchema = z.object({
  id: z.string().uuid(),
  domain: IntelligenceDomainSchema,
  timestamp: z.date(),
  classification: z.enum(['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET', 'SCI']),
  source: z.object({
    id: z.string(),
    type: z.string(),
    reliability: z.enum(['A', 'B', 'C', 'D', 'E', 'F']),
    credibility: z.number().min(1).max(6)
  }),
  content: z.object({
    summary: z.string(),
    details: z.string(),
    rawData: z.any().optional()
  }),
  entities: z.array(z.object({
    type: z.enum(['PERSON', 'ORGANIZATION', 'LOCATION', 'DEVICE', 'NETWORK', 'THREAT', 'CAMPAIGN']),
    id: z.string(),
    name: z.string(),
    confidence: z.number(),
    attributes: z.record(z.any())
  })),
  relationships: z.array(z.object({
    source: z.string(),
    target: z.string(),
    type: z.string(),
    confidence: z.number()
  })),
  indicators: z.array(z.object({
    type: z.string(),
    value: z.string(),
    context: z.string().optional()
  })),
  assessment: z.object({
    confidence: z.number(),
    reliability: z.number(),
    timeliness: z.enum(['CURRENT', 'RECENT', 'DATED', 'HISTORICAL'])
  })
});

export type IntelReport = z.infer<typeof IntelReportSchema>;

export const FusedEntitySchema = z.object({
  id: z.string().uuid(),
  canonicalName: z.string(),
  type: z.enum(['PERSON', 'ORGANIZATION', 'LOCATION', 'DEVICE', 'NETWORK', 'THREAT', 'CAMPAIGN']),
  aliases: z.array(z.string()),
  sources: z.array(z.object({ domain: IntelligenceDomainSchema, reportId: z.string(), confidence: z.number() })),
  attributes: z.record(z.array(z.object({ value: z.any(), source: z.string(), confidence: z.number(), timestamp: z.date() }))),
  relationships: z.array(z.object({
    targetId: z.string(),
    type: z.string(),
    strength: z.number(),
    sources: z.array(z.string())
  })),
  threatScore: z.number(),
  lastUpdated: z.date(),
  conflictingData: z.array(z.object({ attribute: z.string(), values: z.array(z.any()), sources: z.array(z.string()) }))
});

export type FusedEntity = z.infer<typeof FusedEntitySchema>;

export const ThreatPictureSchema = z.object({
  id: z.string().uuid(),
  generatedAt: z.date(),
  timeframe: z.object({ start: z.date(), end: z.date() }),
  threatActors: z.array(z.object({
    id: z.string(),
    name: z.string(),
    threatLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    activity: z.string(),
    targeting: z.array(z.string()),
    capabilities: z.array(z.string())
  })),
  activeCampaigns: z.array(z.object({
    id: z.string(),
    name: z.string(),
    actor: z.string(),
    objectives: z.array(z.string()),
    targets: z.array(z.string()),
    phase: z.string(),
    indicators: z.array(z.string())
  })),
  emergingThreats: z.array(z.object({
    description: z.string(),
    probability: z.number(),
    impact: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    timeframe: z.string(),
    indicators: z.array(z.string())
  })),
  geoHotspots: z.array(z.object({
    region: z.string(),
    threatLevel: z.number(),
    activeThreats: z.number(),
    trend: z.enum(['INCREASING', 'STABLE', 'DECREASING'])
  })),
  recommendations: z.array(z.string())
});

export type ThreatPicture = z.infer<typeof ThreatPictureSchema>;

/**
 * Multi-Domain Fusion Engine
 */
export class FusionEngine {
  private reports: Map<string, IntelReport> = new Map();
  private entities: Map<string, FusedEntity> = new Map();
  private domainWeights: Map<IntelligenceDomain, number> = new Map();
  private correlationThreshold = 0.7;

  constructor() {
    // Default domain weights for fusion
    this.domainWeights.set('SIGINT', 0.9);
    this.domainWeights.set('HUMINT', 0.85);
    this.domainWeights.set('CYBER', 0.9);
    this.domainWeights.set('OSINT', 0.7);
    this.domainWeights.set('GEOINT', 0.85);
    this.domainWeights.set('FININT', 0.8);
    this.domainWeights.set('DARKWEB', 0.75);
  }

  /**
   * Ingest intelligence report from any domain
   */
  async ingestReport(report: IntelReport): Promise<{
    reportId: string;
    entitiesExtracted: number;
    correlationsFound: number;
    alertsGenerated: number;
  }> {
    this.reports.set(report.id, report);

    let correlationsFound = 0;
    let alertsGenerated = 0;

    // Extract and resolve entities
    for (const entity of report.entities) {
      const resolved = await this.resolveEntity(entity, report);
      if (resolved.newCorrelations > 0) {
        correlationsFound += resolved.newCorrelations;
      }
    }

    // Cross-domain correlation
    const crossDomainMatches = await this.crossDomainCorrelation(report);
    correlationsFound += crossDomainMatches.length;

    // Check for alert conditions
    const alerts = this.checkAlertConditions(report);
    alertsGenerated = alerts.length;

    return {
      reportId: report.id,
      entitiesExtracted: report.entities.length,
      correlationsFound,
      alertsGenerated
    };
  }

  /**
   * Entity resolution across domains
   */
  async resolveEntity(rawEntity: IntelReport['entities'][0], sourceReport: IntelReport): Promise<{
    fusedEntityId: string;
    isNew: boolean;
    newCorrelations: number;
  }> {
    // Find potential matches
    const candidates = this.findEntityCandidates(rawEntity);

    if (candidates.length > 0) {
      // Merge with best match
      const bestMatch = candidates[0];
      this.mergeEntity(bestMatch, rawEntity, sourceReport);
      return { fusedEntityId: bestMatch.id, isNew: false, newCorrelations: candidates.length - 1 };
    }

    // Create new fused entity
    const fusedEntity: FusedEntity = {
      id: crypto.randomUUID(),
      canonicalName: rawEntity.name,
      type: rawEntity.type,
      aliases: [rawEntity.name],
      sources: [{ domain: sourceReport.domain, reportId: sourceReport.id, confidence: rawEntity.confidence }],
      attributes: {},
      relationships: [],
      threatScore: 0,
      lastUpdated: new Date(),
      conflictingData: []
    };

    this.entities.set(fusedEntity.id, fusedEntity);
    return { fusedEntityId: fusedEntity.id, isNew: true, newCorrelations: 0 };
  }

  /**
   * Cross-domain correlation analysis
   */
  async crossDomainCorrelation(report: IntelReport): Promise<Array<{
    reportId: string;
    domain: IntelligenceDomain;
    correlationType: string;
    confidence: number;
    matchingIndicators: string[];
  }>> {
    const correlations: any[] = [];

    for (const [id, existingReport] of this.reports) {
      if (id === report.id || existingReport.domain === report.domain) continue;

      // Compare indicators
      const indicatorMatches = this.compareIndicators(report.indicators, existingReport.indicators);
      if (indicatorMatches.length > 0) {
        const confidence = this.calculateCorrelationConfidence(report, existingReport, indicatorMatches);
        if (confidence >= this.correlationThreshold) {
          correlations.push({
            reportId: id,
            domain: existingReport.domain,
            correlationType: 'INDICATOR_MATCH',
            confidence,
            matchingIndicators: indicatorMatches.map(m => m.value)
          });
        }
      }

      // Compare entities
      const entityMatches = this.compareEntities(report.entities, existingReport.entities);
      if (entityMatches.length > 0) {
        correlations.push({
          reportId: id,
          domain: existingReport.domain,
          correlationType: 'ENTITY_MATCH',
          confidence: 0.8,
          matchingIndicators: entityMatches.map(e => e.name)
        });
      }
    }

    return correlations;
  }

  /**
   * Generate unified threat picture
   */
  async generateThreatPicture(timeframe: { start: Date; end: Date }): Promise<ThreatPicture> {
    const relevantReports = Array.from(this.reports.values()).filter(
      r => r.timestamp >= timeframe.start && r.timestamp <= timeframe.end
    );

    // Aggregate threat actors
    const actorMap = new Map<string, any>();
    for (const entity of this.entities.values()) {
      if (entity.type === 'THREAT' || entity.threatScore > 50) {
        actorMap.set(entity.id, {
          id: entity.id,
          name: entity.canonicalName,
          threatLevel: this.calculateThreatLevel(entity.threatScore),
          activity: 'Active',
          targeting: [],
          capabilities: []
        });
      }
    }

    // Identify campaigns
    const campaigns = this.identifyCampaigns(relevantReports);

    // Identify emerging threats
    const emergingThreats = this.identifyEmergingThreats(relevantReports);

    // Calculate geo hotspots
    const geoHotspots = this.calculateGeoHotspots(relevantReports);

    return {
      id: crypto.randomUUID(),
      generatedAt: new Date(),
      timeframe,
      threatActors: Array.from(actorMap.values()),
      activeCampaigns: campaigns,
      emergingThreats,
      geoHotspots,
      recommendations: [
        'Increase monitoring on identified threat actors',
        'Update defensive signatures based on new indicators',
        'Brief stakeholders on emerging threats'
      ]
    };
  }

  /**
   * Query fused intelligence
   */
  query(params: {
    entityType?: string;
    domains?: IntelligenceDomain[];
    threatScoreMin?: number;
    keywords?: string[];
    timeframe?: { start: Date; end: Date };
  }): {
    entities: FusedEntity[];
    reports: IntelReport[];
    correlations: Array<{ source: string; target: string; type: string }>;
  } {
    let entities = Array.from(this.entities.values());
    let reports = Array.from(this.reports.values());

    if (params.entityType) {
      entities = entities.filter(e => e.type === params.entityType);
    }

    if (params.domains) {
      reports = reports.filter(r => params.domains!.includes(r.domain));
      entities = entities.filter(e => e.sources.some(s => params.domains!.includes(s.domain)));
    }

    if (params.threatScoreMin !== undefined) {
      entities = entities.filter(e => e.threatScore >= params.threatScoreMin!);
    }

    if (params.timeframe) {
      reports = reports.filter(r => r.timestamp >= params.timeframe!.start && r.timestamp <= params.timeframe!.end);
    }

    // Extract correlations
    const correlations: any[] = [];
    for (const entity of entities) {
      for (const rel of entity.relationships) {
        correlations.push({ source: entity.id, target: rel.targetId, type: rel.type });
      }
    }

    return { entities, reports, correlations };
  }

  /**
   * Get domain coverage metrics
   */
  getDomainCoverage(): Array<{
    domain: IntelligenceDomain;
    reportCount: number;
    entityCount: number;
    lastReport: Date | null;
    reliability: number;
  }> {
    const coverage: Map<IntelligenceDomain, any> = new Map();

    for (const domain of IntelligenceDomainSchema.options) {
      coverage.set(domain, { domain, reportCount: 0, entityCount: 0, lastReport: null, reliability: 0 });
    }

    for (const report of this.reports.values()) {
      const c = coverage.get(report.domain)!;
      c.reportCount++;
      c.entityCount += report.entities.length;
      if (!c.lastReport || report.timestamp > c.lastReport) {
        c.lastReport = report.timestamp;
      }
    }

    return Array.from(coverage.values());
  }

  // Private helper methods
  private findEntityCandidates(entity: IntelReport['entities'][0]): FusedEntity[] {
    const candidates: Array<{ entity: FusedEntity; score: number }> = [];

    for (const fused of this.entities.values()) {
      if (fused.type !== entity.type) continue;

      let score = 0;
      if (fused.canonicalName.toLowerCase() === entity.name.toLowerCase()) score += 0.8;
      if (fused.aliases.some(a => a.toLowerCase() === entity.name.toLowerCase())) score += 0.6;

      if (score >= this.correlationThreshold) {
        candidates.push({ entity: fused, score });
      }
    }

    return candidates.sort((a, b) => b.score - a.score).map(c => c.entity);
  }

  private mergeEntity(fused: FusedEntity, raw: IntelReport['entities'][0], source: IntelReport): void {
    if (!fused.aliases.includes(raw.name)) {
      fused.aliases.push(raw.name);
    }
    fused.sources.push({ domain: source.domain, reportId: source.id, confidence: raw.confidence });
    fused.lastUpdated = new Date();
  }

  private compareIndicators(a: IntelReport['indicators'], b: IntelReport['indicators']): IntelReport['indicators'] {
    return a.filter(ai => b.some(bi => ai.type === bi.type && ai.value === bi.value));
  }

  private compareEntities(a: IntelReport['entities'], b: IntelReport['entities']): IntelReport['entities'] {
    return a.filter(ae => b.some(be => ae.name.toLowerCase() === be.name.toLowerCase() && ae.type === be.type));
  }

  private calculateCorrelationConfidence(a: IntelReport, b: IntelReport, matches: any[]): number {
    const baseConfidence = 0.5 + (matches.length * 0.1);
    const domainWeightA = this.domainWeights.get(a.domain) || 0.5;
    const domainWeightB = this.domainWeights.get(b.domain) || 0.5;
    return Math.min(1, baseConfidence * ((domainWeightA + domainWeightB) / 2));
  }

  private calculateThreatLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    return 'LOW';
  }

  private identifyCampaigns(reports: IntelReport[]): ThreatPicture['activeCampaigns'] {
    return [];
  }

  private identifyEmergingThreats(reports: IntelReport[]): ThreatPicture['emergingThreats'] {
    return [];
  }

  private calculateGeoHotspots(reports: IntelReport[]): ThreatPicture['geoHotspots'] {
    return [
      { region: 'Eastern Europe', threatLevel: 85, activeThreats: 12, trend: 'INCREASING' },
      { region: 'East Asia', threatLevel: 75, activeThreats: 8, trend: 'STABLE' }
    ];
  }

  private checkAlertConditions(report: IntelReport): any[] {
    return [];
  }

  // Public API
  getEntity(id: string): FusedEntity | undefined { return this.entities.get(id); }
  getAllEntities(): FusedEntity[] { return Array.from(this.entities.values()); }
  getReport(id: string): IntelReport | undefined { return this.reports.get(id); }
  setCorrelationThreshold(threshold: number): void { this.correlationThreshold = threshold; }
  setDomainWeight(domain: IntelligenceDomain, weight: number): void { this.domainWeights.set(domain, weight); }
}

export { FusionEngine };
