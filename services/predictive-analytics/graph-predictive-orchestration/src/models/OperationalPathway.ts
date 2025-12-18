import { z } from 'zod';

// Enums
export enum PathwayType {
  SUPPLY_CHAIN = 'SUPPLY_CHAIN',
  DATA_FLOW = 'DATA_FLOW',
  INVESTIGATION = 'INVESTIGATION',
  RESPONSE = 'RESPONSE',
}

export enum PathwayStatus {
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
  REWIRED = 'REWIRED',
}

export enum RewiringStrategy {
  BYPASS = 'BYPASS',
  PARALLEL = 'PARALLEL',
  CONSOLIDATE = 'CONSOLIDATE',
  OPTIMIZE = 'OPTIMIZE',
}

// Zod Schemas
export const PathwayEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  weight: z.number(),
  properties: z.record(z.any()),
});

export const PathwayTopologySchema = z.object({
  startNodeId: z.string(),
  endNodeId: z.string(),
  intermediateNodes: z.array(z.string()),
  edges: z.array(PathwayEdgeSchema),
});

export const PathwayMetricsSchema = z.object({
  throughput: z.number(),
  latency: z.number(),
  cost: z.number(),
  reliability: z.number().min(0).max(1),
});

export const RewiringEventSchema = z.object({
  id: z.string(),
  timestamp: z.date(),
  reason: z.string(),
  predictionId: z.string().optional(),
  oldTopology: z.any(),
  newTopology: z.any(),
  impact: z.any(),
});

export const OperationalPathwaySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.nativeEnum(PathwayType),
  topology: PathwayTopologySchema,
  status: z.nativeEnum(PathwayStatus),
  metrics: PathwayMetricsSchema,
  rewiringHistory: z.array(RewiringEventSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// TypeScript Types
export type PathwayEdge = z.infer<typeof PathwayEdgeSchema>;
export type PathwayTopology = z.infer<typeof PathwayTopologySchema>;
export type PathwayMetrics = z.infer<typeof PathwayMetricsSchema>;
export type RewiringEvent = z.infer<typeof RewiringEventSchema>;
export type OperationalPathway = z.infer<typeof OperationalPathwaySchema>;

// Input Types
export interface CreatePathwayInput {
  name: string;
  type: PathwayType;
  topology: PathwayTopology;
  metrics: PathwayMetrics;
}

export interface RewirePathwayInput {
  pathwayId: string;
  strategy: RewiringStrategy;
  predictionId: string;
  constraints?: Record<string, any>;
}

export interface RewiringSimulation {
  originalMetrics: PathwayMetrics;
  projectedMetrics: PathwayMetrics;
  impact: Record<string, any>;
  recommendation: string;
}

// Model Class
export class OperationalPathwayModel {
  private pathways: Map<string, OperationalPathway> = new Map();

  /**
   * Create a new operational pathway
   */
  create(input: CreatePathwayInput): OperationalPathway {
    const id = `pathway_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const pathway: OperationalPathway = {
      id,
      name: input.name,
      type: input.type,
      topology: input.topology,
      status: PathwayStatus.ACTIVE,
      metrics: input.metrics,
      rewiringHistory: [],
      createdAt: now,
      updatedAt: now,
    };

    // Validate with Zod
    OperationalPathwaySchema.parse(pathway);

    this.pathways.set(id, pathway);
    return pathway;
  }

  /**
   * Get pathway by ID
   */
  getById(id: string): OperationalPathway | undefined {
    return this.pathways.get(id);
  }

  /**
   * Get all pathways with filters
   */
  getAll(filters?: {
    type?: PathwayType;
    status?: PathwayStatus;
  }): OperationalPathway[] {
    let results = Array.from(this.pathways.values());

    if (filters?.type) {
      results = results.filter((p) => p.type === filters.type);
    }

    if (filters?.status) {
      results = results.filter((p) => p.status === filters.status);
    }

    // Sort by creation date descending
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return results;
  }

  /**
   * Rewire a pathway
   */
  rewire(
    id: string,
    newTopology: PathwayTopology,
    reason: string,
    predictionId?: string,
    impact?: Record<string, any>,
  ): OperationalPathway | undefined {
    const pathway = this.pathways.get(id);
    if (!pathway) {
      return undefined;
    }

    // Record rewiring event
    const rewiringEvent: RewiringEvent = {
      id: `rewiring_${id}_${Date.now()}`,
      timestamp: new Date(),
      reason,
      predictionId,
      oldTopology: pathway.topology,
      newTopology,
      impact: impact || {},
    };

    // Update pathway
    const oldStatus = pathway.status;
    pathway.topology = newTopology;
    pathway.status = PathwayStatus.REWIRED;
    pathway.rewiringHistory.push(rewiringEvent);
    pathway.updatedAt = new Date();

    return pathway;
  }

  /**
   * Update pathway metrics
   */
  updateMetrics(id: string, metrics: Partial<PathwayMetrics>): OperationalPathway | undefined {
    const pathway = this.pathways.get(id);
    if (!pathway) {
      return undefined;
    }

    pathway.metrics = {
      ...pathway.metrics,
      ...metrics,
    };
    pathway.updatedAt = new Date();

    return pathway;
  }

  /**
   * Deprecate a pathway
   */
  deprecate(id: string): OperationalPathway | undefined {
    const pathway = this.pathways.get(id);
    if (!pathway) {
      return undefined;
    }

    pathway.status = PathwayStatus.DEPRECATED;
    pathway.updatedAt = new Date();

    return pathway;
  }

  /**
   * Simulate rewiring (calculate projected metrics)
   */
  simulateRewiring(
    id: string,
    strategy: RewiringStrategy,
    newTopology: PathwayTopology,
  ): RewiringSimulation | undefined {
    const pathway = this.pathways.get(id);
    if (!pathway) {
      return undefined;
    }

    // Calculate projected metrics based on strategy
    const projectedMetrics = this.calculateProjectedMetrics(
      pathway.metrics,
      strategy,
      newTopology,
    );

    // Calculate impact
    const impact = {
      throughputChange: projectedMetrics.throughput - pathway.metrics.throughput,
      latencyChange: projectedMetrics.latency - pathway.metrics.latency,
      costChange: projectedMetrics.cost - pathway.metrics.cost,
      reliabilityChange: projectedMetrics.reliability - pathway.metrics.reliability,
    };

    // Generate recommendation
    const recommendation = this.generateRecommendation(impact);

    return {
      originalMetrics: pathway.metrics,
      projectedMetrics,
      impact,
      recommendation,
    };
  }

  /**
   * Calculate projected metrics (simplified logic)
   */
  private calculateProjectedMetrics(
    currentMetrics: PathwayMetrics,
    strategy: RewiringStrategy,
    newTopology: PathwayTopology,
  ): PathwayMetrics {
    const pathLength = newTopology.edges.length;
    const avgWeight = newTopology.edges.reduce((sum, e) => sum + e.weight, 0) / pathLength;

    switch (strategy) {
      case RewiringStrategy.BYPASS:
        // Bypass: shorter path, better latency, similar cost
        return {
          throughput: currentMetrics.throughput * 1.1,
          latency: currentMetrics.latency * 0.8,
          cost: currentMetrics.cost * 1.05,
          reliability: Math.min(0.99, currentMetrics.reliability * 1.05),
        };

      case RewiringStrategy.PARALLEL:
        // Parallel: higher throughput, higher cost
        return {
          throughput: currentMetrics.throughput * 1.5,
          latency: currentMetrics.latency,
          cost: currentMetrics.cost * 1.4,
          reliability: Math.min(0.99, currentMetrics.reliability * 1.1),
        };

      case RewiringStrategy.CONSOLIDATE:
        // Consolidate: lower cost, lower throughput
        return {
          throughput: currentMetrics.throughput * 0.8,
          latency: currentMetrics.latency * 1.1,
          cost: currentMetrics.cost * 0.7,
          reliability: currentMetrics.reliability * 0.95,
        };

      case RewiringStrategy.OPTIMIZE:
        // Optimize: balanced improvements
        return {
          throughput: currentMetrics.throughput * 1.2,
          latency: currentMetrics.latency * 0.9,
          cost: currentMetrics.cost * 0.95,
          reliability: Math.min(0.99, currentMetrics.reliability * 1.08),
        };

      default:
        return currentMetrics;
    }
  }

  /**
   * Generate recommendation based on impact
   */
  private generateRecommendation(impact: Record<string, number>): string {
    const improvements: string[] = [];
    const regressions: string[] = [];

    if (impact.throughputChange > 0) {
      improvements.push(`+${(impact.throughputChange * 100).toFixed(1)}% throughput`);
    } else if (impact.throughputChange < 0) {
      regressions.push(`${(impact.throughputChange * 100).toFixed(1)}% throughput`);
    }

    if (impact.latencyChange < 0) {
      improvements.push(`${(Math.abs(impact.latencyChange) * 100).toFixed(1)}% faster`);
    } else if (impact.latencyChange > 0) {
      regressions.push(`+${(impact.latencyChange * 100).toFixed(1)}% latency`);
    }

    if (impact.costChange < 0) {
      improvements.push(`${(Math.abs(impact.costChange) * 100).toFixed(1)}% cost savings`);
    } else if (impact.costChange > 0) {
      regressions.push(`+${(impact.costChange * 100).toFixed(1)}% cost`);
    }

    if (impact.reliabilityChange > 0) {
      improvements.push(`+${(impact.reliabilityChange * 100).toFixed(1)}% reliability`);
    } else if (impact.reliabilityChange < 0) {
      regressions.push(`${(impact.reliabilityChange * 100).toFixed(1)}% reliability`);
    }

    if (improvements.length === 0 && regressions.length === 0) {
      return 'No significant impact expected';
    }

    const parts: string[] = [];
    if (improvements.length > 0) {
      parts.push(`Improvements: ${improvements.join(', ')}`);
    }
    if (regressions.length > 0) {
      parts.push(`Tradeoffs: ${regressions.join(', ')}`);
    }

    const netBenefit = impact.throughputChange + (-impact.latencyChange) +
      (-impact.costChange) + impact.reliabilityChange;

    if (netBenefit > 0.1) {
      parts.push('Recommended: Proceed with rewiring');
    } else if (netBenefit < -0.1) {
      parts.push('Not recommended: Negative net impact');
    } else {
      parts.push('Marginal: Consider alternatives');
    }

    return parts.join('. ');
  }

  /**
   * Get pathways by node (pathways that include this node)
   */
  getByNode(nodeId: string): OperationalPathway[] {
    return Array.from(this.pathways.values()).filter((pathway) => {
      return (
        pathway.topology.startNodeId === nodeId ||
        pathway.topology.endNodeId === nodeId ||
        pathway.topology.intermediateNodes.includes(nodeId)
      );
    });
  }

  /**
   * Delete pathway (for testing)
   */
  delete(id: string): boolean {
    return this.pathways.delete(id);
  }

  /**
   * Clear all pathways (for testing)
   */
  clear(): void {
    this.pathways.clear();
  }
}
