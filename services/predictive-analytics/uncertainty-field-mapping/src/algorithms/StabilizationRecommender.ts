import { UncertaintyField } from '../models/UncertaintyField.js';
import { TurbulentZone, UncertaintyDriver } from '../models/TurbulentZone.js';
import {
  StabilizationStrategy,
  StabilizationAction,
  StrategyType,
  EffortLevel,
} from '../models/StabilizationStrategy.js';

export interface RecommenderConfig {
  maxStrategies?: number;
  priorityThreshold?: number;
  includeHighEffort?: boolean;
}

/**
 * Generate stabilization recommendations to reduce uncertainty
 */
export class StabilizationRecommender {
  private config: RecommenderConfig;

  constructor(config: RecommenderConfig = {}) {
    this.config = {
      maxStrategies: config.maxStrategies || 5,
      priorityThreshold: config.priorityThreshold || 0.3,
      includeHighEffort: config.includeHighEffort !== false,
    };
  }

  /**
   * Recommend stabilization strategies for a turbulent zone
   */
  async recommend(
    zone: TurbulentZone,
    field: UncertaintyField
  ): Promise<StabilizationStrategy[]> {
    const strategies: StabilizationStrategy[] = [];

    // Generate strategies based on zone characteristics
    strategies.push(...this.generateDataCollectionStrategies(zone, field));
    strategies.push(...this.generateModelRefinementStrategies(zone, field));
    strategies.push(...this.generateConstraintStrategies(zone, field));
    strategies.push(...this.generatePruningStrategies(zone, field));

    // Score and prioritize strategies
    this.scoreStrategies(strategies, zone);

    // Filter by priority threshold
    const filtered = strategies.filter(
      s => s.priority >= this.config.priorityThreshold!
    );

    // Filter by effort if configured
    const effortFiltered = this.config.includeHighEffort
      ? filtered
      : filtered.filter(s => s.effort !== 'high');

    // Sort by score and return top N
    effortFiltered.sort((a, b) => b.calculateScore() - a.calculateScore());

    return effortFiltered.slice(0, this.config.maxStrategies);
  }

  /**
   * Generate data collection strategies
   */
  private generateDataCollectionStrategies(
    zone: TurbulentZone,
    field: UncertaintyField
  ): StabilizationStrategy[] {
    const strategies: StabilizationStrategy[] = [];

    // Check if zone has data gaps
    if (this.hasDataGaps(zone, field)) {
      const actions = this.createDataCollectionActions(zone, field);

      if (actions.length > 0) {
        strategies.push(
          new StabilizationStrategy({
            zoneId: zone.id,
            type: 'data_collection',
            priority: 0.8, // High priority for data gaps
            expectedReduction: this.estimateDataCollectionReduction(zone, actions),
            effort: this.estimateDataCollectionEffort(actions),
            actions,
            estimatedTimeWeeks: 2,
            estimatedCost: 5000,
          })
        );
      }
    }

    return strategies;
  }

  /**
   * Check if zone has data gaps
   */
  private hasDataGaps(zone: TurbulentZone, field: UncertaintyField): boolean {
    // Check point density in zone
    const zonePoints = field.points.filter(p => zone.containsPoint(p.coordinates));
    const measuredPoints = zonePoints.filter(p => p.source === 'measured');

    const measuredRatio = measuredPoints.length / zonePoints.length;

    return measuredRatio < 0.3; // Less than 30% measured points
  }

  /**
   * Create data collection actions
   */
  private createDataCollectionActions(
    zone: TurbulentZone,
    field: UncertaintyField
  ): StabilizationAction[] {
    const actions: StabilizationAction[] = [];

    // Identify key dimensions with gaps
    for (const dimension of field.dimensions) {
      const dimExtent = zone.bounds.extent[dimension.name];
      const dimRange = (dimension.range.max || 1) - (dimension.range.min || 0);

      if (dimExtent > dimRange * 0.5) {
        // Large extent suggests sparse data
        actions.push({
          description: `Collect additional data across ${dimension.name} dimension`,
          target: dimension.name,
          method: 'targeted_sampling',
          estimatedImpact: 0.3,
          details: {
            dimension: dimension.name,
            currentExtent: dimExtent,
            recommendedSamples: Math.ceil(dimExtent / dimRange * 10),
          },
        });
      }
    }

    // Focus on high-contribution drivers
    const topDrivers = zone.drivers.slice(0, 3);
    for (const driver of topDrivers) {
      actions.push({
        description: `Increase data collection for ${driver.factor}`,
        target: driver.source,
        method: 'source_enrichment',
        estimatedImpact: driver.contribution * 0.5,
        details: {
          driver: driver.factor,
          currentContribution: driver.contribution,
          trend: driver.trend,
        },
      });
    }

    return actions;
  }

  /**
   * Estimate reduction from data collection
   */
  private estimateDataCollectionReduction(
    zone: TurbulentZone,
    actions: StabilizationAction[]
  ): number {
    const totalImpact = actions.reduce((sum, a) => sum + a.estimatedImpact, 0);
    return Math.min(0.6, totalImpact); // Cap at 60% reduction
  }

  /**
   * Estimate effort for data collection
   */
  private estimateDataCollectionEffort(actions: StabilizationAction[]): EffortLevel {
    if (actions.length <= 2) return 'low';
    if (actions.length <= 4) return 'medium';
    return 'high';
  }

  /**
   * Generate model refinement strategies
   */
  private generateModelRefinementStrategies(
    zone: TurbulentZone,
    field: UncertaintyField
  ): StabilizationStrategy[] {
    const strategies: StabilizationStrategy[] = [];

    // Check if zone has model deficiencies
    if (this.hasModelDeficiencies(zone, field)) {
      const actions = this.createModelRefinementActions(zone, field);

      if (actions.length > 0) {
        strategies.push(
          new StabilizationStrategy({
            zoneId: zone.id,
            type: 'model_refinement',
            priority: 0.7,
            expectedReduction: this.estimateModelRefinementReduction(zone, actions),
            effort: 'medium',
            actions,
            estimatedTimeWeeks: 4,
            estimatedCost: 15000,
          })
        );
      }
    }

    return strategies;
  }

  /**
   * Check if zone has model deficiencies
   */
  private hasModelDeficiencies(zone: TurbulentZone, field: UncertaintyField): boolean {
    // High interpolated point ratio suggests model issues
    const zonePoints = field.points.filter(p => zone.containsPoint(p.coordinates));
    const interpolatedPoints = zonePoints.filter(p => p.source === 'interpolated');

    const interpolatedRatio = interpolatedPoints.length / zonePoints.length;

    // Low confidence suggests model uncertainty
    const avgConfidence =
      zonePoints.reduce((sum, p) => sum + p.confidence, 0) / zonePoints.length;

    return interpolatedRatio > 0.7 || avgConfidence < 0.5;
  }

  /**
   * Create model refinement actions
   */
  private createModelRefinementActions(
    zone: TurbulentZone,
    field: UncertaintyField
  ): StabilizationAction[] {
    const actions: StabilizationAction[] = [];

    // Improve interpolation method
    actions.push({
      description: 'Refine interpolation algorithm for better accuracy',
      target: 'interpolation_model',
      method: 'algorithm_upgrade',
      estimatedImpact: 0.25,
      details: {
        currentMethod: 'rbf_gaussian',
        recommendedMethod: 'kriging',
      },
    });

    // Add ensemble methods
    if (zone.intensity > 0.8) {
      actions.push({
        description: 'Implement ensemble prediction methods',
        target: 'prediction_model',
        method: 'ensemble_modeling',
        estimatedImpact: 0.3,
        details: {
          currentApproach: 'single_model',
          recommendedApproach: 'ensemble',
        },
      });
    }

    return actions;
  }

  /**
   * Estimate reduction from model refinement
   */
  private estimateModelRefinementReduction(
    zone: TurbulentZone,
    actions: StabilizationAction[]
  ): number {
    const totalImpact = actions.reduce((sum, a) => sum + a.estimatedImpact, 0);
    return Math.min(0.5, totalImpact);
  }

  /**
   * Generate constraint addition strategies
   */
  private generateConstraintStrategies(
    zone: TurbulentZone,
    field: UncertaintyField
  ): StabilizationStrategy[] {
    const strategies: StabilizationStrategy[] = [];

    // Check if constraints can be added
    if (this.canAddConstraints(zone, field)) {
      const actions = this.createConstraintActions(zone, field);

      if (actions.length > 0) {
        strategies.push(
          new StabilizationStrategy({
            zoneId: zone.id,
            type: 'constraint_addition',
            priority: 0.6,
            expectedReduction: this.estimateConstraintReduction(zone, actions),
            effort: 'low',
            actions,
            estimatedTimeWeeks: 1,
            estimatedCost: 2000,
          })
        );
      }
    }

    return strategies;
  }

  /**
   * Check if constraints can be added
   */
  private canAddConstraints(zone: TurbulentZone, field: UncertaintyField): boolean {
    // Large volume suggests unconstrained prediction space
    return zone.volume > 0.1;
  }

  /**
   * Create constraint addition actions
   */
  private createConstraintActions(
    zone: TurbulentZone,
    field: UncertaintyField
  ): StabilizationAction[] {
    const actions: StabilizationAction[] = [];

    // Add domain constraints
    actions.push({
      description: 'Add domain knowledge constraints to narrow prediction space',
      target: 'prediction_space',
      method: 'domain_constraints',
      estimatedImpact: 0.2,
      details: {
        currentVolume: zone.volume,
        expectedReduction: 0.3,
      },
    });

    // Add temporal constraints if applicable
    const temporalDim = field.getTemporalDimension();
    if (temporalDim && zone.bounds.extent[temporalDim.name] > 0.5) {
      actions.push({
        description: 'Add temporal constraints to focus predictions',
        target: temporalDim.name,
        method: 'temporal_windowing',
        estimatedImpact: 0.15,
        details: {
          dimension: temporalDim.name,
          currentExtent: zone.bounds.extent[temporalDim.name],
        },
      });
    }

    return actions;
  }

  /**
   * Estimate reduction from constraints
   */
  private estimateConstraintReduction(
    zone: TurbulentZone,
    actions: StabilizationAction[]
  ): number {
    const totalImpact = actions.reduce((sum, a) => sum + a.estimatedImpact, 0);
    return Math.min(0.4, totalImpact);
  }

  /**
   * Generate scenario pruning strategies
   */
  private generatePruningStrategies(
    zone: TurbulentZone,
    field: UncertaintyField
  ): StabilizationStrategy[] {
    const strategies: StabilizationStrategy[] = [];

    // Check if scenarios can be pruned
    if (this.canPruneScenarios(zone, field)) {
      const actions = this.createPruningActions(zone, field);

      if (actions.length > 0) {
        strategies.push(
          new StabilizationStrategy({
            zoneId: zone.id,
            type: 'scenario_pruning',
            priority: 0.5,
            expectedReduction: this.estimatePruningReduction(zone, actions),
            effort: 'low',
            actions,
            estimatedTimeWeeks: 1,
            estimatedCost: 1000,
          })
        );
      }
    }

    return strategies;
  }

  /**
   * Check if scenarios can be pruned
   */
  private canPruneScenarios(zone: TurbulentZone, field: UncertaintyField): boolean {
    // Check for categorical dimensions with many categories
    for (const dimension of field.dimensions) {
      if (dimension.type === 'categorical') {
        const categories = dimension.range.categories || [];
        if (categories.length > 5) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Create pruning actions
   */
  private createPruningActions(
    zone: TurbulentZone,
    field: UncertaintyField
  ): StabilizationAction[] {
    const actions: StabilizationAction[] = [];

    // Prune low-probability scenarios
    actions.push({
      description: 'Remove low-probability scenarios to focus predictions',
      target: 'scenario_space',
      method: 'probability_pruning',
      estimatedImpact: 0.2,
      details: {
        currentScenarios: 'all',
        recommendedThreshold: 0.05,
      },
    });

    return actions;
  }

  /**
   * Estimate reduction from pruning
   */
  private estimatePruningReduction(
    zone: TurbulentZone,
    actions: StabilizationAction[]
  ): number {
    const totalImpact = actions.reduce((sum, a) => sum + a.estimatedImpact, 0);
    return Math.min(0.3, totalImpact);
  }

  /**
   * Score all strategies based on zone characteristics
   */
  private scoreStrategies(strategies: StabilizationStrategy[], zone: TurbulentZone): void {
    for (const strategy of strategies) {
      // Adjust priority based on zone severity
      const severityMultiplier = {
        low: 0.5,
        medium: 0.8,
        high: 1.0,
        critical: 1.2,
      }[zone.getSeverity()];

      strategy.priority *= severityMultiplier;

      // Boost priority for expanding zones
      if (zone.isExpanding()) {
        strategy.priority *= 1.2;
      }

      // Cap priority at 1.0
      strategy.priority = Math.min(1.0, strategy.priority);
    }
  }

  /**
   * Optimize strategy portfolio within budget
   */
  optimizePortfolio(
    strategies: StabilizationStrategy[],
    maxCost?: number,
    maxTimeWeeks?: number
  ): StabilizationStrategy[] {
    let selected: StabilizationStrategy[] = [];
    let totalCost = 0;
    let totalTime = 0;

    // Sort by ROI (if cost available) or score
    const sorted = [...strategies].sort((a, b) => {
      const roiA = a.estimateROI();
      const roiB = b.estimateROI();

      if (roiA !== undefined && roiB !== undefined) {
        return roiB - roiA;
      }

      return b.calculateScore() - a.calculateScore();
    });

    // Greedy selection within constraints
    for (const strategy of sorted) {
      const cost = strategy.estimatedCost || 0;
      const time = strategy.estimatedTimeWeeks || 0;

      if (
        (!maxCost || totalCost + cost <= maxCost) &&
        (!maxTimeWeeks || totalTime + time <= maxTimeWeeks)
      ) {
        selected.push(strategy);
        totalCost += cost;
        totalTime += time;
      }
    }

    return selected;
  }
}
