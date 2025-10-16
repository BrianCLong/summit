/**
 * Chaos Engineering Test Runner
 * Sprint 27E: Automated reliability testing with safety controls
 */

import yaml from 'yaml';
import fs from 'fs/promises';
import { EventEmitter } from 'events';

export interface ChaosExperiment {
  name: string;
  description: string;
  type: string;
  target: any;
  faultInjection: any;
  expectedBehavior: string[];
  successCriteria: Record<string, any>;
  duration?: string;
  rollbackTimeout?: string;
}

export interface ExperimentResult {
  name: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'success' | 'failure' | 'aborted';
  metrics: Record<string, number>;
  observations: string[];
  errors?: string[];
  rollbackExecuted?: boolean;
}

export interface SafetyConfig {
  maxConcurrentExperiments: number;
  sloThreshold: number;
  emergencyStopConditions: string[];
  blastRadiusLimits: {
    maxAffectedServices: number;
    maxUserImpact: number;
    maxDuration: string;
  };
}

export class ChaosRunner extends EventEmitter {
  private experiments = new Map<string, ChaosExperiment>();
  private activeExperiments = new Map<string, ExperimentResult>();
  private safetyConfig: SafetyConfig;
  private emergencyStop = false;

  constructor(safetyConfig: SafetyConfig) {
    super();
    this.safetyConfig = safetyConfig;
    this.startSafetyMonitoring();
  }

  /**
   * Load chaos experiments from configuration
   */
  async loadExperiments(configPath: string): Promise<void> {
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      const config = yaml.parse(content);

      for (const experiment of config.experiments || []) {
        this.experiments.set(experiment.name, experiment);
      }

      this.emit('experiments_loaded', {
        count: this.experiments.size,
        experiments: Array.from(this.experiments.keys()),
      });
    } catch (error) {
      this.emit('error', {
        type: 'config_load_error',
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Execute a single chaos experiment
   */
  async runExperiment(name: string): Promise<ExperimentResult> {
    if (this.emergencyStop) {
      throw new Error('Emergency stop active - experiments disabled');
    }

    const experiment = this.experiments.get(name);
    if (!experiment) {
      throw new Error(`Experiment '${name}' not found`);
    }

    // Check safety limits
    if (
      this.activeExperiments.size >= this.safetyConfig.maxConcurrentExperiments
    ) {
      throw new Error('Maximum concurrent experiments reached');
    }

    // Pre-experiment validation
    await this.validatePreConditions(experiment);

    const result: ExperimentResult = {
      name,
      startTime: new Date(),
      status: 'running',
      metrics: {},
      observations: [],
    };

    this.activeExperiments.set(name, result);

    try {
      this.emit('experiment_started', { name, experiment });

      // Execute fault injection
      await this.injectFault(experiment);

      // Monitor experiment
      await this.monitorExperiment(experiment, result);

      // Validate results
      const success = await this.validateSuccessCriteria(experiment, result);

      result.status = success ? 'success' : 'failure';
      result.endTime = new Date();

      this.emit('experiment_completed', { name, result });
    } catch (error) {
      result.status = 'failure';
      result.endTime = new Date();
      result.errors = [error.message];

      this.emit('experiment_failed', { name, error: error.message });
    } finally {
      // Always execute rollback
      await this.executeRollback(experiment, result);
      this.activeExperiments.delete(name);
    }

    return result;
  }

  /**
   * Run experiment suite
   */
  async runSuite(experimentNames: string[]): Promise<ExperimentResult[]> {
    const results: ExperimentResult[] = [];

    for (const name of experimentNames) {
      try {
        const result = await this.runExperiment(name);
        results.push(result);

        // Stop suite on critical failure
        if (result.status === 'failure' && this.isCriticalFailure(result)) {
          this.emit('suite_aborted', {
            reason: 'Critical failure detected',
            failedExperiment: name,
          });
          break;
        }
      } catch (error) {
        this.emit('suite_error', {
          experiment: name,
          error: error.message,
        });
        break;
      }
    }

    return results;
  }

  /**
   * Emergency stop all experiments
   */
  async emergencyStopAll(reason: string): Promise<void> {
    this.emergencyStop = true;

    this.emit('emergency_stop', {
      reason,
      activeExperiments: Array.from(this.activeExperiments.keys()),
      timestamp: new Date(),
    });

    // Abort all active experiments
    const rollbackPromises = Array.from(this.activeExperiments.entries()).map(
      async ([name, result]) => {
        result.status = 'aborted';
        result.endTime = new Date();

        const experiment = this.experiments.get(name);
        if (experiment) {
          await this.executeRollback(experiment, result);
        }
      },
    );

    await Promise.all(rollbackPromises);
    this.activeExperiments.clear();
  }

  /**
   * Resume operations after emergency stop
   */
  resume(): void {
    this.emergencyStop = false;
    this.emit('operations_resumed', { timestamp: new Date() });
  }

  /**
   * Get current experiment status
   */
  getStatus(): {
    emergencyStop: boolean;
    activeExperiments: string[];
    totalExperiments: number;
    safetyConfig: SafetyConfig;
  } {
    return {
      emergencyStop: this.emergencyStop,
      activeExperiments: Array.from(this.activeExperiments.keys()),
      totalExperiments: this.experiments.size,
      safetyConfig: this.safetyConfig,
    };
  }

  private async validatePreConditions(
    experiment: ChaosExperiment,
  ): Promise<void> {
    // Check system health
    const healthCheck = await this.checkSystemHealth();
    if (!healthCheck.healthy) {
      throw new Error(`System unhealthy: ${healthCheck.reason}`);
    }

    // Check SLO compliance
    const sloCompliance = await this.checkSLOCompliance();
    if (sloCompliance < this.safetyConfig.sloThreshold) {
      throw new Error(`SLO compliance below threshold: ${sloCompliance}`);
    }

    // Validate blast radius
    await this.validateBlastRadius(experiment);
  }

  private async injectFault(experiment: ChaosExperiment): Promise<void> {
    const { faultInjection } = experiment;

    switch (faultInjection.type) {
      case 'network_partition':
        await this.injectNetworkPartition(faultInjection);
        break;

      case 'latency_injection':
        await this.injectLatency(faultInjection);
        break;

      case 'pod_kill':
        await this.killPod(faultInjection);
        break;

      case 'memory_stress':
        await this.injectMemoryStress(faultInjection);
        break;

      case 'io_stress':
        await this.injectIOStress(faultInjection);
        break;

      default:
        throw new Error(`Unknown fault injection type: ${faultInjection.type}`);
    }
  }

  private async monitorExperiment(
    experiment: ChaosExperiment,
    result: ExperimentResult,
  ): Promise<void> {
    const duration = this.parseDuration(experiment.duration || '5m');
    const startTime = Date.now();

    while (Date.now() - startTime < duration) {
      // Check safety conditions
      if (this.emergencyStop) {
        throw new Error('Emergency stop activated');
      }

      // Collect metrics
      const metrics = await this.collectMetrics();
      Object.assign(result.metrics, metrics);

      // Check for emergency stop conditions
      for (const condition of this.safetyConfig.emergencyStopConditions) {
        if (await this.evaluateCondition(condition, metrics)) {
          throw new Error(`Emergency condition met: ${condition}`);
        }
      }

      // Record observations
      const observations = await this.collectObservations(experiment);
      result.observations.push(...observations);

      // Wait before next check
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  private async validateSuccessCriteria(
    experiment: ChaosExperiment,
    result: ExperimentResult,
  ): Promise<boolean> {
    const { successCriteria } = experiment;
    const { metrics } = result;

    for (const [criterion, expectedValue] of Object.entries(successCriteria)) {
      const actualValue = metrics[criterion];

      if (actualValue === undefined) {
        console.warn(`Missing metric for criterion: ${criterion}`);
        continue;
      }

      // Simple comparison (extend for complex criteria)
      if (typeof expectedValue === 'number') {
        if (actualValue < expectedValue) {
          result.observations.push(
            `Criterion failed: ${criterion} = ${actualValue}, expected >= ${expectedValue}`,
          );
          return false;
        }
      } else if (typeof expectedValue === 'boolean') {
        if (actualValue !== expectedValue) {
          result.observations.push(
            `Criterion failed: ${criterion} = ${actualValue}, expected ${expectedValue}`,
          );
          return false;
        }
      }
    }

    return true;
  }

  private async executeRollback(
    experiment: ChaosExperiment,
    result: ExperimentResult,
  ): Promise<void> {
    try {
      // Implement rollback based on experiment type
      switch (experiment.faultInjection.type) {
        case 'network_partition':
          await this.restoreNetwork();
          break;

        case 'latency_injection':
          await this.removeLatencyInjection();
          break;

        case 'pod_kill':
          await this.restartPods(experiment.target);
          break;

        case 'memory_stress':
          await this.stopMemoryStress();
          break;

        case 'io_stress':
          await this.stopIOStress();
          break;
      }

      result.rollbackExecuted = true;
      this.emit('rollback_completed', { experiment: experiment.name });
    } catch (error) {
      this.emit('rollback_failed', {
        experiment: experiment.name,
        error: error.message,
      });
      throw error;
    }
  }

  private async checkSystemHealth(): Promise<{
    healthy: boolean;
    reason?: string;
  }> {
    // Implement health checks
    // This is a simplified version
    return { healthy: true };
  }

  private async checkSLOCompliance(): Promise<number> {
    // Implement SLO compliance check
    // Return compliance percentage (0.0 - 1.0)
    return 0.95;
  }

  private async validateBlastRadius(
    experiment: ChaosExperiment,
  ): Promise<void> {
    // Implement blast radius validation
    const estimatedImpact = this.estimateImpact(experiment);

    if (
      estimatedImpact.affectedServices >
      this.safetyConfig.blastRadiusLimits.maxAffectedServices
    ) {
      throw new Error('Experiment exceeds maximum affected services limit');
    }

    if (
      estimatedImpact.userImpact >
      this.safetyConfig.blastRadiusLimits.maxUserImpact
    ) {
      throw new Error('Experiment exceeds maximum user impact limit');
    }
  }

  private estimateImpact(experiment: ChaosExperiment): {
    affectedServices: number;
    userImpact: number;
  } {
    // Simplified impact estimation
    return {
      affectedServices: 1,
      userImpact: 0.05,
    };
  }

  private async collectMetrics(): Promise<Record<string, number>> {
    // Implement metrics collection from monitoring systems
    return {
      api_availability: 0.98,
      error_rate: 0.02,
      response_time_p95: 250,
      slo_compliance: 0.95,
    };
  }

  private async collectObservations(
    experiment: ChaosExperiment,
  ): Promise<string[]> {
    // Implement observation collection
    return [`System responding to ${experiment.type} fault injection`];
  }

  private async evaluateCondition(
    condition: string,
    metrics: Record<string, number>,
  ): Promise<boolean> {
    // Implement condition evaluation
    // This is a simplified version
    return false;
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smh])$/);
    if (!match) return 300000; // Default 5 minutes

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      default:
        return 300000;
    }
  }

  private isCriticalFailure(result: ExperimentResult): boolean {
    // Determine if failure is critical enough to stop suite
    return (
      result.errors?.some(
        (error) => error.includes('Emergency') || error.includes('Critical'),
      ) || false
    );
  }

  private startSafetyMonitoring(): void {
    // Periodic safety checks
    setInterval(async () => {
      if (this.emergencyStop) return;

      try {
        const sloCompliance = await this.checkSLOCompliance();
        if (sloCompliance < this.safetyConfig.sloThreshold) {
          await this.emergencyStopAll('SLO compliance below threshold');
        }
      } catch (error) {
        console.error('Safety monitoring error:', error);
      }
    }, 30000); // Check every 30 seconds
  }

  // Fault injection implementations (simplified)
  private async injectNetworkPartition(config: any): Promise<void> {
    console.log('Injecting network partition:', config);
  }

  private async injectLatency(config: any): Promise<void> {
    console.log('Injecting latency:', config);
  }

  private async killPod(config: any): Promise<void> {
    console.log('Killing pod:', config);
  }

  private async injectMemoryStress(config: any): Promise<void> {
    console.log('Injecting memory stress:', config);
  }

  private async injectIOStress(config: any): Promise<void> {
    console.log('Injecting I/O stress:', config);
  }

  // Rollback implementations (simplified)
  private async restoreNetwork(): Promise<void> {
    console.log('Restoring network connectivity');
  }

  private async removeLatencyInjection(): Promise<void> {
    console.log('Removing latency injection');
  }

  private async restartPods(target: any): Promise<void> {
    console.log('Restarting pods:', target);
  }

  private async stopMemoryStress(): Promise<void> {
    console.log('Stopping memory stress');
  }

  private async stopIOStress(): Promise<void> {
    console.log('Stopping I/O stress');
  }
}
