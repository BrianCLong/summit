import { v4 as uuidv4 } from 'uuid';

/**
 * Experiment tracking and management system
 */
export class ExperimentTracker {
  private experiments: Map<string, Experiment> = new Map();
  private runs: Map<string, ExperimentRun> = new Map();

  /**
   * Create a new experiment
   */
  createExperiment(config: {
    name: string;
    description?: string;
    tags?: string[];
    metadata?: Record<string, any>;
  }): Experiment {
    const experiment: Experiment = {
      id: uuidv4(),
      name: config.name,
      description: config.description,
      tags: config.tags || [],
      metadata: config.metadata || {},
      runs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.experiments.set(experiment.id, experiment);
    return experiment;
  }

  /**
   * Log a new experiment run
   */
  logRun(experimentId: string, config: {
    name?: string;
    parameters: Record<string, any>;
    metrics?: Record<string, number>;
    artifacts?: Record<string, any>;
    tags?: string[];
  }): ExperimentRun {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    const run: ExperimentRun = {
      id: uuidv4(),
      experimentId,
      name: config.name || `Run ${experiment.runs.length + 1}`,
      parameters: config.parameters,
      metrics: config.metrics || {},
      artifacts: config.artifacts || {},
      tags: config.tags || [],
      status: 'running',
      startTime: new Date().toISOString(),
    };

    this.runs.set(run.id, run);
    experiment.runs.push(run.id);
    experiment.updatedAt = new Date().toISOString();

    return run;
  }

  /**
   * Update run metrics
   */
  logMetrics(runId: string, metrics: Record<string, number>): void {
    const run = this.runs.get(runId);
    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }

    run.metrics = { ...run.metrics, ...metrics };
    run.updatedAt = new Date().toISOString();
  }

  /**
   * Log parameters for a run
   */
  logParameters(runId: string, parameters: Record<string, any>): void {
    const run = this.runs.get(runId);
    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }

    run.parameters = { ...run.parameters, ...parameters };
    run.updatedAt = new Date().toISOString();
  }

  /**
   * Log artifacts (models, plots, etc.)
   */
  logArtifact(runId: string, name: string, artifact: any): void {
    const run = this.runs.get(runId);
    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }

    run.artifacts[name] = artifact;
    run.updatedAt = new Date().toISOString();
  }

  /**
   * Complete a run
   */
  completeRun(runId: string, success: boolean = true, error?: string): void {
    const run = this.runs.get(runId);
    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }

    run.status = success ? 'completed' : 'failed';
    run.endTime = new Date().toISOString();
    if (error) {
      run.error = error;
    }
    run.updatedAt = new Date().toISOString();
  }

  /**
   * Get experiment by ID
   */
  getExperiment(experimentId: string): Experiment | undefined {
    return this.experiments.get(experimentId);
  }

  /**
   * Get run by ID
   */
  getRun(runId: string): ExperimentRun | undefined {
    return this.runs.get(runId);
  }

  /**
   * List all experiments
   */
  listExperiments(filters?: {
    tags?: string[];
    nameContains?: string;
  }): Experiment[] {
    let experiments = Array.from(this.experiments.values());

    if (filters?.tags) {
      experiments = experiments.filter(exp =>
        filters.tags!.some(tag => exp.tags.includes(tag))
      );
    }

    if (filters?.nameContains) {
      experiments = experiments.filter(exp =>
        exp.name.toLowerCase().includes(filters.nameContains!.toLowerCase())
      );
    }

    return experiments;
  }

  /**
   * List runs for an experiment
   */
  listRuns(experimentId: string, filters?: {
    status?: string;
    tags?: string[];
  }): ExperimentRun[] {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    let runs = experiment.runs
      .map(id => this.runs.get(id))
      .filter((run): run is ExperimentRun => run !== undefined);

    if (filters?.status) {
      runs = runs.filter(run => run.status === filters.status);
    }

    if (filters?.tags) {
      runs = runs.filter(run =>
        filters.tags!.some(tag => run.tags.includes(tag))
      );
    }

    return runs;
  }

  /**
   * Compare runs
   */
  compareRuns(runIds: string[]): {
    runs: ExperimentRun[];
    comparison: {
      parameters: Record<string, any[]>;
      metrics: Record<string, number[]>;
    };
  } {
    const runs = runIds
      .map(id => this.runs.get(id))
      .filter((run): run is ExperimentRun => run !== undefined);

    if (runs.length === 0) {
      throw new Error('No valid runs found for comparison');
    }

    const allParameterKeys = new Set<string>();
    const allMetricKeys = new Set<string>();

    runs.forEach(run => {
      Object.keys(run.parameters).forEach(key => allParameterKeys.add(key));
      Object.keys(run.metrics).forEach(key => allMetricKeys.add(key));
    });

    const parameters: Record<string, any[]> = {};
    const metrics: Record<string, number[]> = {};

    allParameterKeys.forEach(key => {
      parameters[key] = runs.map(run => run.parameters[key]);
    });

    allMetricKeys.forEach(key => {
      metrics[key] = runs.map(run => run.metrics[key]);
    });

    return {
      runs,
      comparison: {
        parameters,
        metrics,
      },
    };
  }

  /**
   * Get best run based on metric
   */
  getBestRun(
    experimentId: string,
    metric: string,
    direction: 'maximize' | 'minimize' = 'maximize'
  ): ExperimentRun | undefined {
    const runs = this.listRuns(experimentId, { status: 'completed' });

    if (runs.length === 0) return undefined;

    return runs.reduce((best, current) => {
      const bestValue = best.metrics[metric];
      const currentValue = current.metrics[metric];

      if (bestValue === undefined) return current;
      if (currentValue === undefined) return best;

      const isBetter = direction === 'maximize'
        ? currentValue > bestValue
        : currentValue < bestValue;

      return isBetter ? current : best;
    });
  }

  /**
   * Track model lineage
   */
  trackLineage(runId: string, lineage: {
    parentRuns?: string[];
    datasetVersion?: string;
    codeVersion?: string;
    dependencies?: Record<string, string>;
  }): void {
    const run = this.runs.get(runId);
    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }

    run.lineage = lineage;
    run.updatedAt = new Date().toISOString();
  }

  /**
   * Calculate resource usage for an experiment
   */
  calculateResourceUsage(experimentId: string): {
    totalRuns: number;
    completedRuns: number;
    failedRuns: number;
    totalTime: number;
    avgTime: number;
    estimatedCost: number;
  } {
    const runs = this.listRuns(experimentId);

    const completed = runs.filter(r => r.status === 'completed').length;
    const failed = runs.filter(r => r.status === 'failed').length;

    const times = runs
      .filter(r => r.startTime && r.endTime)
      .map(r => {
        const start = new Date(r.startTime).getTime();
        const end = new Date(r.endTime!).getTime();
        return (end - start) / 1000;
      });

    const totalTime = times.reduce((sum, t) => sum + t, 0);
    const avgTime = times.length > 0 ? totalTime / times.length : 0;
    const estimatedCost = totalTime * 0.001; // Example cost calculation

    return {
      totalRuns: runs.length,
      completedRuns: completed,
      failedRuns: failed,
      totalTime,
      avgTime,
      estimatedCost,
    };
  }
}

// Types

export interface Experiment {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  metadata: Record<string, any>;
  runs: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ExperimentRun {
  id: string;
  experimentId: string;
  name: string;
  parameters: Record<string, any>;
  metrics: Record<string, number>;
  artifacts: Record<string, any>;
  tags: string[];
  status: 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  updatedAt?: string;
  error?: string;
  lineage?: {
    parentRuns?: string[];
    datasetVersion?: string;
    codeVersion?: string;
    dependencies?: Record<string, string>;
  };
}
