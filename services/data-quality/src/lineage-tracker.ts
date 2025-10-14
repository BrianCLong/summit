/**
 * Data Lineage Tracking System
 * Sprint 27F: Comprehensive data provenance and quality management
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import {
  AssetManager,
  type AssetCriticality,
  type AssetRegistrationInput,
  type AssetUsageEvent
} from '../../../packages/shared/asset-manager';

export interface DataAsset {
  id: string;
  name: string;
  type: 'table' | 'view' | 'file' | 'api' | 'stream';
  schema: Record<string, any>;
  location: string;
  owner: string;
  tags: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataTransformation {
  id: string;
  name: string;
  type: 'etl' | 'ml_training' | 'aggregation' | 'cleaning' | 'validation';
  inputAssets: string[];
  outputAssets: string[];
  transformationLogic: string;
  parameters: Record<string, any>;
  executedBy: string;
  executedAt: Date;
  executionTime: number;
  status: 'success' | 'failure' | 'partial';
  qualityScore?: number;
}

export interface LineageEdge {
  from: string;
  to: string;
  transformationId: string;
  relationship: 'derives_from' | 'depends_on' | 'references' | 'aggregates';
  weight: number;
  metadata: Record<string, any>;
}

export interface QualityMetric {
  assetId: string;
  metricType: 'completeness' | 'accuracy' | 'consistency' | 'timeliness' | 'validity';
  value: number;
  threshold: number;
  status: 'pass' | 'warn' | 'fail';
  measuredAt: Date;
  details: Record<string, any>;
}

export interface ImpactAnalysis {
  assetId: string;
  impactedAssets: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  propagationPath: string[];
  estimatedAffectedRows: number;
  businessImpact: string[];
}

interface DataAssetMetadata {
  schema: Record<string, any>;
  location: string;
  metadata: Record<string, any>;
  tags: string[];
  owner: string;
  lastQualityMetric?: QualityMetric;
  qualitySampleSize?: number;
  lastImpactAssessment?: {
    changeType: 'schema' | 'data' | 'deletion';
    severity: 'low' | 'medium' | 'high' | 'critical';
    impactedAssets: string[];
    analyzedAt: Date;
  };
  lastTransformation?: {
    id: string;
    executedAt: Date;
    status: DataTransformation['status'];
    type: DataTransformation['type'];
    executedBy: string;
  };
}

export class DataLineageTracker extends EventEmitter {
  private assets = new Map<string, DataAsset>();
  private transformations = new Map<string, DataTransformation>();
  private lineageGraph = new Map<string, LineageEdge[]>();
  private qualityMetrics = new Map<string, QualityMetric[]>();
  private assetManager: AssetManager<DataAssetMetadata>;

  constructor(assetManager?: AssetManager<DataAssetMetadata>) {
    super();
    this.assetManager = assetManager ?? new AssetManager<DataAssetMetadata>({ usageHistoryLimit: 200 });
  }

  private syncDataAssetWithManager(asset: DataAsset): void {
    const registration = this.toDataAssetRegistration(asset);
    this.assetManager.registerAsset(registration);
  }

  private toDataAssetRegistration(asset: DataAsset): AssetRegistrationInput<DataAssetMetadata> {
    return {
      id: asset.id,
      name: asset.name,
      type: asset.type,
      domain: 'data',
      owners: [asset.owner],
      tags: asset.tags,
      criticality: this.deriveDataAssetCriticality(asset),
      metadata: {
        schema: asset.schema,
        location: asset.location,
        metadata: asset.metadata,
        tags: asset.tags,
        owner: asset.owner
      }
    };
  }

  private deriveDataAssetCriticality(asset: DataAsset): AssetCriticality {
    const tags = asset.tags.map(tag => tag.toLowerCase());
    if (tags.some(tag => ['pii', 'phi', 'restricted', 'classified'].includes(tag))) {
      return 'critical';
    }
    if (tags.some(tag => ['financial', 'gold', 'authoritative', 'mission_critical'].includes(tag))) {
      return 'high';
    }
    if (tags.some(tag => ['internal', 'sensitive', 'regulated'].includes(tag))) {
      return 'medium';
    }
    return 'low';
  }

  private recordDataAssetUsage(assetId: string, event: AssetUsageEvent): void {
    this.assetManager.recordUsage(assetId, event);
  }

  private refreshQualityInManager(assetId: string): void {
    const metrics = this.qualityMetrics.get(assetId) || [];
    if (metrics.length === 0) {
      return;
    }

    const score = this.calculateQualityHealthScore(metrics);
    const latest = metrics[metrics.length - 1];

    this.assetManager.updateAsset(assetId, {
      healthScore: score,
      metadata: {
        lastQualityMetric: latest,
        qualitySampleSize: metrics.length
      }
    });
  }

  private calculateQualityHealthScore(metrics: QualityMetric[]): number {
    if (metrics.length === 0) {
      return 100;
    }

    const weight: Record<QualityMetric['status'], number> = {
      pass: 1,
      warn: 0.6,
      fail: 0.2
    };

    const total = metrics.reduce((sum, metric) => sum + weight[metric.status], 0);
    return Math.round((total / metrics.length) * 100);
  }

  /**
   * Register a new data asset
   */
  registerAsset(asset: Omit<DataAsset, 'id' | 'createdAt' | 'updatedAt'>): DataAsset {
    const fullAsset: DataAsset = {
      ...asset,
      id: this.generateAssetId(asset.name, asset.location),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.assets.set(fullAsset.id, fullAsset);
    this.emit('asset_registered', fullAsset);
    this.syncDataAssetWithManager(fullAsset);
    this.recordDataAssetUsage(fullAsset.id, {
      context: 'asset_registration',
      outcome: 'success',
      details: {
        type: fullAsset.type,
        location: fullAsset.location
      }
    });

    return fullAsset;
  }

  /**
   * Track a data transformation
   */
  trackTransformation(transformation: Omit<DataTransformation, 'id'>): DataTransformation {
    const fullTransformation: DataTransformation = {
      ...transformation,
      id: crypto.randomUUID()
    };

    this.transformations.set(fullTransformation.id, fullTransformation);

    // Update lineage graph
    this.updateLineageGraph(fullTransformation);

    for (const inputAssetId of fullTransformation.inputAssets) {
      this.recordDataAssetUsage(inputAssetId, {
        context: 'transformation_input',
        outcome: fullTransformation.status === 'failure' ? 'failure' : 'success',
        details: {
          transformationId: fullTransformation.id,
          name: fullTransformation.name,
          type: fullTransformation.type
        }
      });
    }

    for (const outputAssetId of fullTransformation.outputAssets) {
      this.recordDataAssetUsage(outputAssetId, {
        context: 'transformation_output',
        outcome: fullTransformation.status === 'failure' ? 'warning' : 'success',
        details: {
          transformationId: fullTransformation.id,
          name: fullTransformation.name,
          type: fullTransformation.type
        }
      });

      this.assetManager.updateAsset(outputAssetId, {
        metadata: {
          lastTransformation: {
            id: fullTransformation.id,
            executedAt: fullTransformation.executedAt,
            status: fullTransformation.status,
            type: fullTransformation.type,
            executedBy: fullTransformation.executedBy
          }
        }
      });

      for (const inputAssetId of fullTransformation.inputAssets) {
        this.assetManager.linkDependency(outputAssetId, inputAssetId);
      }
    }

    this.emit('transformation_tracked', fullTransformation);

    return fullTransformation;
  }

  /**
   * Get complete lineage for an asset
   */
  getLineage(assetId: string, direction: 'upstream' | 'downstream' | 'both' = 'both'): {
    nodes: DataAsset[];
    edges: LineageEdge[];
    transformations: DataTransformation[];
  } {
    const visitedNodes = new Set<string>();
    const lineageNodes = new Map<string, DataAsset>();
    const lineageEdges: LineageEdge[] = [];
    const lineageTransformations = new Map<string, DataTransformation>();

    this.traverseLineage(assetId, direction, visitedNodes, lineageNodes, lineageEdges, lineageTransformations);

    return {
      nodes: Array.from(lineageNodes.values()),
      edges: lineageEdges,
      transformations: Array.from(lineageTransformations.values())
    };
  }

  /**
   * Perform impact analysis for changes to an asset
   */
  analyzeImpact(assetId: string, changeType: 'schema' | 'data' | 'deletion'): ImpactAnalysis {
    const downstreamLineage = this.getLineage(assetId, 'downstream');
    const impactedAssets = downstreamLineage.nodes.map(n => n.id).filter(id => id !== assetId);

    // Calculate severity based on number of downstream assets and their importance
    const severity = this.calculateImpactSeverity(impactedAssets, changeType);

    // Build propagation path
    const propagationPath = this.buildPropagationPath(assetId, impactedAssets);

    // Estimate affected rows (simplified)
    const estimatedAffectedRows = this.estimateAffectedRows(assetId, impactedAssets);

    // Identify business impact
    const businessImpact = this.identifyBusinessImpact(impactedAssets);

    this.recordDataAssetUsage(assetId, {
      context: 'impact_analysis',
      outcome: 'analysis',
      details: {
        changeType,
        severity,
        impactedAssets: impactedAssets.length
      }
    });

    for (const impactedAssetId of impactedAssets) {
      this.recordDataAssetUsage(impactedAssetId, {
        context: 'impact_analysis',
        outcome: 'warning',
        details: {
          sourceAsset: assetId,
          severity,
          changeType
        }
      });
    }

    this.assetManager.updateAsset(assetId, {
      metadata: {
        lastImpactAssessment: {
          changeType,
          severity,
          impactedAssets,
          analyzedAt: new Date()
        }
      }
    });

    return {
      assetId,
      impactedAssets,
      severity,
      propagationPath,
      estimatedAffectedRows,
      businessImpact
    };
  }

  /**
   * Track data quality metrics
   */
  recordQualityMetric(metric: QualityMetric): void {
    if (!this.qualityMetrics.has(metric.assetId)) {
      this.qualityMetrics.set(metric.assetId, []);
    }

    const metrics = this.qualityMetrics.get(metric.assetId)!;
    metrics.push(metric);

    // Keep only last 100 measurements per asset
    if (metrics.length > 100) {
      metrics.splice(0, metrics.length - 100);
    }

    this.emit('quality_metric_recorded', metric);

    // Trigger alerts if quality degrades
    if (metric.status === 'fail') {
      this.emit('quality_alert', metric);
    }

    this.recordDataAssetUsage(metric.assetId, {
      context: 'quality_metric',
      outcome: metric.status === 'fail' ? 'failure' : metric.status === 'warn' ? 'warning' : 'success',
      details: {
        metricType: metric.metricType,
        value: metric.value,
        threshold: metric.threshold
      }
    });
    this.refreshQualityInManager(metric.assetId);
  }

  /**
   * Get data quality report for an asset
   */
  getQualityReport(assetId: string, timeRange?: { start: Date; end: Date }): {
    overall_score: number;
    metrics: QualityMetric[];
    trends: Record<string, 'improving' | 'stable' | 'degrading'>;
    recommendations: string[];
  } {
    const metrics = this.qualityMetrics.get(assetId) || [];

    let filteredMetrics = metrics;
    if (timeRange) {
      filteredMetrics = metrics.filter(m =>
        m.measuredAt >= timeRange.start && m.measuredAt <= timeRange.end
      );
    }

    const overallScore = this.calculateOverallQualityScore(filteredMetrics);
    const trends = this.calculateQualityTrends(filteredMetrics);
    const recommendations = this.generateQualityRecommendations(filteredMetrics);

    return {
      overall_score: overallScore,
      metrics: filteredMetrics,
      trends,
      recommendations
    };
  }

  getAssetInventorySnapshot(limit = 20): {
    summary: ReturnType<AssetManager<DataAssetMetadata>['getDomainSummary']>;
    assets: ReturnType<AssetManager<DataAssetMetadata>['listAssets']>;
  } {
    return {
      summary: this.assetManager.getDomainSummary('data'),
      assets: this.assetManager.listAssets({ domain: 'data' }).slice(0, limit)
    };
  }

  /**
   * Find data assets by various criteria
   */
  findAssets(criteria: {
    type?: string;
    owner?: string;
    tags?: string[];
    qualityThreshold?: number;
    lastUpdatedAfter?: Date;
  }): DataAsset[] {
    return Array.from(this.assets.values()).filter(asset => {
      if (criteria.type && asset.type !== criteria.type) return false;
      if (criteria.owner && asset.owner !== criteria.owner) return false;
      if (criteria.tags && !criteria.tags.every(tag => asset.tags.includes(tag))) return false;
      if (criteria.lastUpdatedAfter && asset.updatedAt < criteria.lastUpdatedAfter) return false;

      if (criteria.qualityThreshold) {
        const quality = this.getQualityReport(asset.id);
        if (quality.overall_score < criteria.qualityThreshold) return false;
      }

      return true;
    });
  }

  /**
   * Get transformation performance metrics
   */
  getTransformationMetrics(transformationId?: string): {
    total_executions: number;
    success_rate: number;
    average_execution_time: number;
    quality_impact: number;
    last_execution: Date | null;
  } {
    const transformations = transformationId
      ? [this.transformations.get(transformationId)].filter(Boolean)
      : Array.from(this.transformations.values());

    const totalExecutions = transformations.length;
    const successfulExecutions = transformations.filter(t => t.status === 'success').length;
    const successRate = totalExecutions > 0 ? successfulExecutions / totalExecutions : 0;

    const executionTimes = transformations.map(t => t.executionTime);
    const averageExecutionTime = executionTimes.length > 0
      ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
      : 0;

    const lastExecution = transformations.length > 0
      ? transformations.reduce((latest, t) => latest.executedAt > t.executedAt ? latest : t).executedAt
      : null;

    // Calculate quality impact (simplified)
    const qualityImpact = this.calculateQualityImpact(transformations);

    return {
      total_executions: totalExecutions,
      success_rate: successRate,
      average_execution_time: averageExecutionTime,
      quality_impact: qualityImpact,
      last_execution: lastExecution
    };
  }

  /**
   * Export lineage as GraphQL schema
   */
  exportAsGraphQL(): string {
    const assets = Array.from(this.assets.values());
    const transformations = Array.from(this.transformations.values());

    let schema = `
type DataAsset {
  id: ID!
  name: String!
  type: AssetType!
  schema: JSON
  location: String!
  owner: String!
  tags: [String!]!
  metadata: JSON
  createdAt: DateTime!
  updatedAt: DateTime!
  upstreamAssets: [DataAsset!]!
  downstreamAssets: [DataAsset!]!
  transformations: [DataTransformation!]!
  qualityMetrics: [QualityMetric!]!
}

type DataTransformation {
  id: ID!
  name: String!
  type: TransformationType!
  inputAssets: [DataAsset!]!
  outputAssets: [DataAsset!]!
  transformationLogic: String!
  parameters: JSON
  executedBy: String!
  executedAt: DateTime!
  executionTime: Int!
  status: ExecutionStatus!
  qualityScore: Float
}

enum AssetType {
  TABLE
  VIEW
  FILE
  API
  STREAM
}

enum TransformationType {
  ETL
  ML_TRAINING
  AGGREGATION
  CLEANING
  VALIDATION
}

enum ExecutionStatus {
  SUCCESS
  FAILURE
  PARTIAL
}

type QualityMetric {
  assetId: ID!
  metricType: QualityMetricType!
  value: Float!
  threshold: Float!
  status: QualityStatus!
  measuredAt: DateTime!
  details: JSON
}

enum QualityMetricType {
  COMPLETENESS
  ACCURACY
  CONSISTENCY
  TIMELINESS
  VALIDITY
}

enum QualityStatus {
  PASS
  WARN
  FAIL
}

type Query {
  assets(filter: AssetFilter): [DataAsset!]!
  asset(id: ID!): DataAsset
  lineage(assetId: ID!, direction: LineageDirection): LineageGraph!
  impactAnalysis(assetId: ID!, changeType: ChangeType!): ImpactAnalysis!
  qualityReport(assetId: ID!, timeRange: TimeRange): QualityReport!
}

type Mutation {
  registerAsset(input: AssetInput!): DataAsset!
  trackTransformation(input: TransformationInput!): DataTransformation!
  recordQualityMetric(input: QualityMetricInput!): QualityMetric!
}
`;

    return schema;
  }

  private generateAssetId(name: string, location: string): string {
    const content = `${name}:${location}`;
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  private updateLineageGraph(transformation: DataTransformation): void {
    // Create edges from inputs to outputs through this transformation
    for (const inputId of transformation.inputAssets) {
      for (const outputId of transformation.outputAssets) {
        const edge: LineageEdge = {
          from: inputId,
          to: outputId,
          transformationId: transformation.id,
          relationship: 'derives_from',
          weight: 1.0,
          metadata: {
            transformation_type: transformation.type,
            executed_at: transformation.executedAt
          }
        };

        if (!this.lineageGraph.has(inputId)) {
          this.lineageGraph.set(inputId, []);
        }
        this.lineageGraph.get(inputId)!.push(edge);
      }
    }
  }

  private traverseLineage(
    assetId: string,
    direction: 'upstream' | 'downstream' | 'both',
    visited: Set<string>,
    nodes: Map<string, DataAsset>,
    edges: LineageEdge[],
    transformations: Map<string, DataTransformation>
  ): void {
    if (visited.has(assetId)) return;
    visited.add(assetId);

    const asset = this.assets.get(assetId);
    if (asset) {
      nodes.set(assetId, asset);
    }

    // Traverse downstream
    if (direction === 'downstream' || direction === 'both') {
      const downstreamEdges = this.lineageGraph.get(assetId) || [];
      for (const edge of downstreamEdges) {
        edges.push(edge);
        const transformation = this.transformations.get(edge.transformationId);
        if (transformation) {
          transformations.set(transformation.id, transformation);
        }
        this.traverseLineage(edge.to, direction, visited, nodes, edges, transformations);
      }
    }

    // Traverse upstream
    if (direction === 'upstream' || direction === 'both') {
      for (const [fromId, edgeList] of this.lineageGraph.entries()) {
        for (const edge of edgeList) {
          if (edge.to === assetId) {
            edges.push(edge);
            const transformation = this.transformations.get(edge.transformationId);
            if (transformation) {
              transformations.set(transformation.id, transformation);
            }
            this.traverseLineage(fromId, direction, visited, nodes, edges, transformations);
          }
        }
      }
    }
  }

  private calculateImpactSeverity(impactedAssets: string[], changeType: string): 'low' | 'medium' | 'high' | 'critical' {
    const assetCount = impactedAssets.length;

    // Business critical assets
    const criticalAssets = impactedAssets.filter(id => {
      const asset = this.assets.get(id);
      return asset?.tags.includes('critical') || asset?.tags.includes('production');
    }).length;

    if (changeType === 'deletion' && criticalAssets > 0) return 'critical';
    if (assetCount > 20 || criticalAssets > 3) return 'high';
    if (assetCount > 5 || criticalAssets > 0) return 'medium';
    return 'low';
  }

  private buildPropagationPath(assetId: string, impactedAssets: string[]): string[] {
    // Simplified propagation path - in practice, this would use graph algorithms
    return [assetId, ...impactedAssets.slice(0, 5)];
  }

  private estimateAffectedRows(assetId: string, impactedAssets: string[]): number {
    // Simplified estimation - would use actual row counts in practice
    return impactedAssets.length * 1000000;
  }

  private identifyBusinessImpact(impactedAssets: string[]): string[] {
    const impacts: string[] = [];

    for (const assetId of impactedAssets) {
      const asset = this.assets.get(assetId);
      if (!asset) continue;

      if (asset.tags.includes('revenue')) impacts.push('Revenue reporting affected');
      if (asset.tags.includes('compliance')) impacts.push('Regulatory compliance at risk');
      if (asset.tags.includes('customer-facing')) impacts.push('Customer experience degradation');
      if (asset.tags.includes('ml-model')) impacts.push('ML model performance degradation');
    }

    return [...new Set(impacts)];
  }

  private calculateOverallQualityScore(metrics: QualityMetric[]): number {
    if (metrics.length === 0) return 0;

    const weights = {
      completeness: 0.25,
      accuracy: 0.30,
      consistency: 0.20,
      timeliness: 0.15,
      validity: 0.10
    };

    let totalScore = 0;
    let totalWeight = 0;

    const metricsByType = metrics.reduce((acc, metric) => {
      if (!acc[metric.metricType]) acc[metric.metricType] = [];
      acc[metric.metricType].push(metric);
      return acc;
    }, {} as Record<string, QualityMetric[]>);

    for (const [type, typeMetrics] of Object.entries(metricsByType)) {
      const weight = weights[type] || 0.1;
      const avgScore = typeMetrics.reduce((sum, m) => sum + m.value, 0) / typeMetrics.length;
      totalScore += avgScore * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  private calculateQualityTrends(metrics: QualityMetric[]): Record<string, 'improving' | 'stable' | 'degrading'> {
    const trends: Record<string, 'improving' | 'stable' | 'degrading'> = {};

    const metricsByType = metrics.reduce((acc, metric) => {
      if (!acc[metric.metricType]) acc[metric.metricType] = [];
      acc[metric.metricType].push(metric);
      return acc;
    }, {} as Record<string, QualityMetric[]>);

    for (const [type, typeMetrics] of Object.entries(metricsByType)) {
      if (typeMetrics.length < 2) {
        trends[type] = 'stable';
        continue;
      }

      typeMetrics.sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime());
      const recent = typeMetrics.slice(-10);
      const older = typeMetrics.slice(-20, -10);

      if (older.length === 0) {
        trends[type] = 'stable';
        continue;
      }

      const recentAvg = recent.reduce((sum, m) => sum + m.value, 0) / recent.length;
      const olderAvg = older.reduce((sum, m) => sum + m.value, 0) / older.length;

      const change = (recentAvg - olderAvg) / olderAvg;

      if (change > 0.05) trends[type] = 'improving';
      else if (change < -0.05) trends[type] = 'degrading';
      else trends[type] = 'stable';
    }

    return trends;
  }

  private generateQualityRecommendations(metrics: QualityMetric[]): string[] {
    const recommendations: string[] = [];

    const recentMetrics = metrics.slice(-20);
    const failingMetrics = recentMetrics.filter(m => m.status === 'fail');

    if (failingMetrics.length > 0) {
      const failuresByType = failingMetrics.reduce((acc, m) => {
        acc[m.metricType] = (acc[m.metricType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      for (const [type, count] of Object.entries(failuresByType)) {
        switch (type) {
          case 'completeness':
            recommendations.push('Implement data validation rules to prevent null/missing values');
            break;
          case 'accuracy':
            recommendations.push('Review data source quality and transformation logic');
            break;
          case 'consistency':
            recommendations.push('Standardize data formats and establish referential integrity');
            break;
          case 'timeliness':
            recommendations.push('Optimize data pipeline performance and scheduling');
            break;
          case 'validity':
            recommendations.push('Add business rule validation and data type constraints');
            break;
        }
      }
    }

    return recommendations;
  }

  private calculateQualityImpact(transformations: DataTransformation[]): number {
    const transformationsWithQuality = transformations.filter(t => t.qualityScore !== undefined);

    if (transformationsWithQuality.length === 0) return 0;

    const avgQuality = transformationsWithQuality.reduce((sum, t) => sum + t.qualityScore!, 0) / transformationsWithQuality.length;
    return avgQuality;
  }
}