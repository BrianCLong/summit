/**
 * Section Generator Interface and Factory
 * Generates content for individual report sections
 */

import type { ReportSection } from '../types/index.js';
import { ReportRepository } from '../repositories/ReportRepository.js';

export interface ISectionGenerator {
  readonly sectionName: string;
  generate(parameters: Record<string, any>, repository: ReportRepository): Promise<ReportSection>;
}

/**
 * Base class for section generators
 */
export abstract class BaseSectionGenerator implements ISectionGenerator {
  abstract readonly sectionName: string;

  abstract generate(parameters: Record<string, any>, repository: ReportRepository): Promise<ReportSection>;

  protected createSection(name: string, title: string, data: any): ReportSection {
    return {
      name,
      title,
      data,
      generatedAt: new Date(),
    };
  }

  protected getSectionTitle(sectionName: string): string {
    const titles: Record<string, string> = {
      executive_summary: 'Executive Summary',
      investigation_timeline: 'Investigation Timeline',
      key_entities: 'Key Entities',
      relationship_analysis: 'Relationship Analysis',
      evidence_summary: 'Evidence Summary',
      findings_conclusions: 'Findings and Conclusions',
      recommendations: 'Recommendations',
      entity_overview: 'Entity Overview',
      basic_information: 'Basic Information',
      connection_analysis: 'Connection Analysis',
      activity_timeline: 'Activity Timeline',
      risk_assessment: 'Risk Assessment',
      media_evidence: 'Media Evidence',
      related_investigations: 'Related Investigations',
      network_overview: 'Network Overview',
      network_topology: 'Network Topology',
      centrality_analysis: 'Centrality Analysis',
      community_detection: 'Community Detection',
      community_structure: 'Community Structure',
      key_players: 'Key Players',
      influence_patterns: 'Influence Patterns',
      communication_flows: 'Communication Flows',
      anomaly_detection: 'Anomaly Detection',
      compliance_overview: 'Compliance Overview',
      security_findings: 'Security Findings',
      access_patterns: 'Access Patterns',
      violations_summary: 'Violations Summary',
      remediation_plan: 'Remediation Plan',
      audit_scope: 'Audit Scope',
      key_metrics: 'Key Metrics',
      trend_analysis: 'Trend Analysis',
      performance_indicators: 'Performance Indicators',
      anomaly_highlights: 'Anomaly Highlights',
      predictive_insights: 'Predictive Insights',
      action_items: 'Action Items',
      timeline_overview: 'Timeline Overview',
      activity_patterns: 'Activity Patterns',
      frequency_analysis: 'Frequency Analysis',
      correlation_analysis: 'Correlation Analysis',
      predictive_trends: 'Predictive Trends',
    };

    return titles[sectionName] || sectionName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

/**
 * Executive Summary Section Generator
 */
export class ExecutiveSummaryGenerator extends BaseSectionGenerator {
  readonly sectionName = 'executive_summary';

  async generate(parameters: Record<string, any>, repository: ReportRepository): Promise<ReportSection> {
    const { investigationId, summaryLevel = 'detailed' } = parameters;

    const [investigation, entityCounts, relationshipCounts] = await Promise.all([
      repository.getInvestigation(investigationId),
      repository.getEntityCounts(investigationId),
      repository.getRelationshipCounts(investigationId),
    ]);

    if (!investigation) {
      throw new Error(`Investigation not found: ${investigationId}`);
    }

    const data = {
      investigation: {
        id: investigation.id,
        title: investigation.title,
        description: investigation.description,
        status: investigation.status,
        priority: investigation.priority,
        createdAt: investigation.createdAt,
        lastUpdated: investigation.updatedAt,
      },
      overview: {
        totalEntities: entityCounts.totalEntities,
        entityTypes: entityCounts.entityTypes,
        totalRelationships: relationshipCounts.totalRelationships,
        relationshipTypes: relationshipCounts.relationshipTypes,
      },
      keyInsights: this.generateKeyInsights(entityCounts, relationshipCounts, summaryLevel),
      riskLevel: this.calculateRiskLevel(entityCounts, relationshipCounts),
      completionStatus: this.calculateCompletionStatus(investigation),
    };

    return this.createSection(this.sectionName, this.getSectionTitle(this.sectionName), data);
  }

  private generateKeyInsights(
    entityCounts: { totalEntities: number; entityTypes: number },
    relationshipCounts: { totalRelationships: number; relationshipTypes: number },
    summaryLevel: string,
  ): any[] {
    const insights = [];

    if (entityCounts.totalEntities > 50) {
      insights.push({
        type: 'ENTITY_CONCENTRATION',
        description: `High concentration of ${entityCounts.totalEntities} entities detected`,
        confidence: 0.85,
        impact: 'MEDIUM',
      });
    }

    if (relationshipCounts.totalRelationships > entityCounts.totalEntities * 2) {
      insights.push({
        type: 'DENSE_NETWORK',
        description: 'Highly connected network with dense relationship patterns',
        confidence: 0.9,
        impact: 'HIGH',
      });
    }

    if (insights.length === 0) {
      insights.push({
        type: 'STANDARD_ANALYSIS',
        description: 'Investigation data within normal parameters',
        confidence: 0.8,
        impact: 'LOW',
      });
    }

    return insights;
  }

  private calculateRiskLevel(
    entityCounts: { totalEntities: number },
    relationshipCounts: { totalRelationships: number },
  ): string {
    const ratio = relationshipCounts.totalRelationships / Math.max(entityCounts.totalEntities, 1);
    if (ratio > 3) return 'HIGH';
    if (ratio > 1.5) return 'MEDIUM';
    return 'LOW';
  }

  private calculateCompletionStatus(investigation: any): number {
    // Basic completion calculation based on investigation status
    const statusScores: Record<string, number> = {
      NEW: 10,
      ACTIVE: 50,
      IN_REVIEW: 75,
      COMPLETED: 100,
      ARCHIVED: 100,
    };
    return statusScores[investigation.status] || 50;
  }
}

/**
 * Key Entities Section Generator
 */
export class KeyEntitiesGenerator extends BaseSectionGenerator {
  readonly sectionName = 'key_entities';

  async generate(parameters: Record<string, any>, repository: ReportRepository): Promise<ReportSection> {
    const { investigationId, includeConnections = true } = parameters;

    const entities = await repository.getKeyEntities(investigationId, 20);

    const entitiesWithAnalysis = await Promise.all(
      entities.map(async (entity: any) => {
        const entityData: any = {
          id: entity.id,
          label: entity.label,
          type: entity.type,
          connectionCount: entity.connectionCount,
          importance: this.calculateImportance(entity.connectionCount),
          riskLevel: this.calculateEntityRisk(entity),
          lastActivity: entity.lastActivity,
        };

        if (includeConnections && entity.connectionCount > 0) {
          entityData.connections = await repository.getEntityConnections(entity.id, 5);
        }

        return entityData;
      }),
    );

    const data = {
      entities: entitiesWithAnalysis,
      totalCount: entitiesWithAnalysis.length,
      summary: {
        highImportance: entitiesWithAnalysis.filter((e) => e.importance === 'HIGH').length,
        mediumImportance: entitiesWithAnalysis.filter((e) => e.importance === 'MEDIUM').length,
        lowImportance: entitiesWithAnalysis.filter((e) => e.importance === 'LOW').length,
      },
    };

    return this.createSection(this.sectionName, this.getSectionTitle(this.sectionName), data);
  }

  private calculateImportance(connectionCount: number): string {
    if (connectionCount > 10) return 'HIGH';
    if (connectionCount > 3) return 'MEDIUM';
    return 'LOW';
  }

  private calculateEntityRisk(entity: any): string {
    if (entity.risk_score >= 0.7) return 'HIGH';
    if (entity.risk_score >= 0.4) return 'MEDIUM';
    return 'LOW';
  }
}

/**
 * Timeline Section Generator
 */
export class TimelineGenerator extends BaseSectionGenerator {
  readonly sectionName = 'investigation_timeline';

  async generate(parameters: Record<string, any>, repository: ReportRepository): Promise<ReportSection> {
    const { investigationId, timeRange } = parameters;

    const options: { startDate?: Date; endDate?: Date; limit?: number } = { limit: 100 };
    if (timeRange?.start) options.startDate = new Date(timeRange.start);
    if (timeRange?.end) options.endDate = new Date(timeRange.end);

    const events = await repository.getTimelineEvents(investigationId, options);
    const groupedEvents = this.groupEventsByPeriod(events, 'day');

    const data = {
      events,
      groupedEvents,
      totalEvents: events.length,
      timespan: {
        start: events[0]?.timestamp,
        end: events[events.length - 1]?.timestamp,
      },
      statistics: this.calculateStatistics(events),
    };

    return this.createSection(this.sectionName, this.getSectionTitle(this.sectionName), data);
  }

  private groupEventsByPeriod(events: any[], period: 'hour' | 'day' | 'week' | 'month'): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};

    for (const event of events) {
      if (!event.timestamp) continue;

      const date = new Date(event.timestamp);
      let key: string;

      switch (period) {
        case 'hour':
          key = `${date.toISOString().slice(0, 13)}:00`;
          break;
        case 'day':
          key = date.toISOString().slice(0, 10);
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().slice(0, 10);
          break;
        case 'month':
          key = date.toISOString().slice(0, 7);
          break;
      }

      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(event);
    }

    return grouped;
  }

  private calculateStatistics(events: any[]): Record<string, any> {
    const typeDistribution: Record<string, number> = {};
    const entityTypeDistribution: Record<string, number> = {};

    for (const event of events) {
      typeDistribution[event.eventType] = (typeDistribution[event.eventType] || 0) + 1;
      entityTypeDistribution[event.entityType] = (entityTypeDistribution[event.entityType] || 0) + 1;
    }

    return {
      eventTypeDistribution: typeDistribution,
      entityTypeDistribution,
      averageEventsPerDay: events.length / Math.max(1, this.getDaySpan(events)),
    };
  }

  private getDaySpan(events: any[]): number {
    if (events.length < 2) return 1;
    const first = new Date(events[0].timestamp);
    const last = new Date(events[events.length - 1].timestamp);
    return Math.ceil((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)) || 1;
  }
}

/**
 * Network Overview Section Generator
 */
export class NetworkOverviewGenerator extends BaseSectionGenerator {
  readonly sectionName = 'network_overview';

  async generate(parameters: Record<string, any>, repository: ReportRepository): Promise<ReportSection> {
    const { investigationId } = parameters;

    const networkData = await repository.getNetworkData(investigationId);
    const metrics = this.calculateNetworkMetrics(networkData);

    const data = {
      networkMetrics: metrics,
      nodeCount: networkData.nodes.length,
      edgeCount: networkData.edges.length,
      topNodes: this.getTopNodes(networkData.nodes, 10),
    };

    return this.createSection(this.sectionName, this.getSectionTitle(this.sectionName), data);
  }

  private calculateNetworkMetrics(network: { nodes: any[]; edges: any[] }): Record<string, any> {
    const n = network.nodes.length;
    const m = network.edges.length;
    const avgDegree = n > 0
      ? network.nodes.reduce((sum, node) => sum + (node.connections || 0), 0) / n
      : 0;
    const density = n > 1 ? (2 * m) / (n * (n - 1)) : 0;

    return {
      nodeCount: n,
      edgeCount: m,
      averageDegree: Math.round(avgDegree * 100) / 100,
      density: Math.round(density * 1000) / 1000,
      centralityMeasures: {},
    };
  }

  private getTopNodes(nodes: any[], limit: number): any[] {
    return [...nodes]
      .sort((a, b) => (b.connections || 0) - (a.connections || 0))
      .slice(0, limit);
  }
}

/**
 * Generic/Placeholder Section Generator
 */
export class PlaceholderSectionGenerator extends BaseSectionGenerator {
  constructor(public readonly sectionName: string) {
    super();
  }

  async generate(parameters: Record<string, any>, _repository: ReportRepository): Promise<ReportSection> {
    return this.createSection(
      this.sectionName,
      this.getSectionTitle(this.sectionName),
      { message: 'Section data will be populated in future implementation', parameters },
    );
  }
}

/**
 * Section Generator Factory
 */
export class SectionGeneratorFactory {
  private generators: Map<string, ISectionGenerator> = new Map();

  constructor() {
    this.registerDefaultGenerators();
  }

  private registerDefaultGenerators(): void {
    this.register(new ExecutiveSummaryGenerator());
    this.register(new KeyEntitiesGenerator());
    this.register(new TimelineGenerator());
    this.register(new NetworkOverviewGenerator());
  }

  register(generator: ISectionGenerator): void {
    this.generators.set(generator.sectionName, generator);
  }

  getGenerator(sectionName: string): ISectionGenerator {
    const generator = this.generators.get(sectionName);
    if (generator) return generator;

    // Return placeholder for unimplemented sections
    return new PlaceholderSectionGenerator(sectionName);
  }

  hasGenerator(sectionName: string): boolean {
    return this.generators.has(sectionName);
  }

  getRegisteredSections(): string[] {
    return Array.from(this.generators.keys());
  }
}
