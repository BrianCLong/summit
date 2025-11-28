import { v4 as uuidv4 } from 'uuid';

export type StrategyType = 'data_collection' | 'model_refinement' | 'constraint_addition' | 'scenario_pruning';
export type EffortLevel = 'low' | 'medium' | 'high';

export interface StabilizationAction {
  description: string;
  target: string;
  method: string;
  estimatedImpact: number;
  details?: Record<string, any>;
}

export interface StabilizationStrategyData {
  id?: string;
  zoneId: string;
  type: StrategyType;
  priority: number;
  expectedReduction: number;
  effort: EffortLevel;
  actions: StabilizationAction[];
  estimatedCost?: number;
  estimatedTimeWeeks?: number;
}

export class StabilizationStrategy {
  id: string;
  zoneId: string;
  type: StrategyType;
  priority: number;
  expectedReduction: number;
  effort: EffortLevel;
  actions: StabilizationAction[];
  estimatedCost?: number;
  estimatedTimeWeeks?: number;

  constructor(data: StabilizationStrategyData) {
    this.id = data.id || uuidv4();
    this.zoneId = data.zoneId;
    this.type = data.type;
    this.priority = data.priority;
    this.expectedReduction = data.expectedReduction;
    this.effort = data.effort;
    this.actions = data.actions;
    this.estimatedCost = data.estimatedCost;
    this.estimatedTimeWeeks = data.estimatedTimeWeeks;
  }

  /**
   * Calculate strategy score for prioritization
   */
  calculateScore(): number {
    const effortMultiplier = {
      low: 1.0,
      medium: 0.7,
      high: 0.4,
    };

    const timeMultiplier = this.estimatedTimeWeeks
      ? 1 / Math.log(this.estimatedTimeWeeks + 1)
      : 1;

    return (
      this.priority *
      this.expectedReduction *
      effortMultiplier[this.effort] *
      timeMultiplier
    );
  }

  /**
   * Get total estimated impact
   */
  getTotalImpact(): number {
    return this.actions.reduce((sum, action) => sum + action.estimatedImpact, 0);
  }

  /**
   * Get primary action (highest impact)
   */
  getPrimaryAction(): StabilizationAction | undefined {
    return this.actions.reduce((max, action) =>
      action.estimatedImpact > (max?.estimatedImpact || 0) ? action : max
    , undefined as StabilizationAction | undefined);
  }

  /**
   * Check if strategy is high priority
   */
  isHighPriority(): boolean {
    return this.priority > 0.7;
  }

  /**
   * Check if strategy is quick win (high impact, low effort)
   */
  isQuickWin(): boolean {
    return this.expectedReduction > 0.5 && this.effort === 'low';
  }

  /**
   * Get effort as numeric value
   */
  getEffortValue(): number {
    const effortMap = {
      low: 1,
      medium: 2,
      high: 3,
    };
    return effortMap[this.effort];
  }

  /**
   * Compare with another strategy for prioritization
   */
  compareTo(other: StabilizationStrategy): number {
    return other.calculateScore() - this.calculateScore();
  }

  /**
   * Create execution plan
   */
  createExecutionPlan(): {
    phase: number;
    action: StabilizationAction;
    dependencies: string[];
  }[] {
    // Sort actions by impact (descending)
    const sortedActions = [...this.actions].sort(
      (a, b) => b.estimatedImpact - a.estimatedImpact
    );

    // Create phases
    return sortedActions.map((action, index) => ({
      phase: index + 1,
      action,
      dependencies: index > 0 ? [sortedActions[index - 1].target] : [],
    }));
  }

  /**
   * Estimate ROI (return on investment)
   */
  estimateROI(): number | undefined {
    if (!this.estimatedCost) return undefined;

    // ROI = (Expected Reduction * Value) / Cost
    // Assume 1 unit reduction = $10k value (configurable)
    const unitValue = 10000;
    const totalValue = this.expectedReduction * unitValue;

    return (totalValue - this.estimatedCost) / this.estimatedCost;
  }

  /**
   * Get strategy description
   */
  getDescription(): string {
    const typeDescriptions = {
      data_collection: 'Collect additional data to reduce uncertainty',
      model_refinement: 'Refine predictive models to improve accuracy',
      constraint_addition: 'Add constraints to narrow prediction space',
      scenario_pruning: 'Remove unlikely scenarios to focus predictions',
    };

    return typeDescriptions[this.type];
  }

  /**
   * Serialize to JSON
   */
  toJSON() {
    return {
      id: this.id,
      zoneId: this.zoneId,
      type: this.type,
      priority: this.priority,
      expectedReduction: this.expectedReduction,
      effort: this.effort,
      actions: this.actions,
      estimatedCost: this.estimatedCost,
      estimatedTimeWeeks: this.estimatedTimeWeeks,
    };
  }

  /**
   * Create from JSON
   */
  static fromJSON(json: any): StabilizationStrategy {
    return new StabilizationStrategy(json);
  }
}

/**
 * Result of applying a stabilization strategy
 */
export interface StabilizationResult {
  success: boolean;
  strategyId: string;
  appliedAt: Date;
  actualReduction?: number;
  message?: string;
}
