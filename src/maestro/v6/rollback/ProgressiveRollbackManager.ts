import { EventEmitter } from 'events';
import { Logger } from '../../utils/logger';
import type { RollbackExecution, RollbackStep } from './IntelligentRollbackSystem';
import { StateManager, RecoveryPlan, RecoveryPlanStep, ServiceTier } from './StateManager';

interface ActiveRollback {
  cancelled: boolean;
}

export class ProgressiveRollbackManager extends EventEmitter {
  private logger: Logger;
  private stateManager: StateManager;
  private activeRollbacks: Map<string, ActiveRollback> = new Map();

  constructor(logger: Logger, stateManager: StateManager) {
    super();
    this.logger = logger;
    this.stateManager = stateManager;
  }

  async initialize(): Promise<void> {
    this.logger.info('ProgressiveRollbackManager initialized');
  }

  async executeProgressiveRollback(execution: RollbackExecution): Promise<void> {
    const plan = await this.ensureRecoveryPlan(execution.deploymentId);
    const rollbackState = { cancelled: false };
    this.activeRollbacks.set(execution.id, rollbackState);

    execution.steps = plan.steps.map(step => ({
      id: step.id,
      name: step.name,
      status: 'pending'
    }));

    for (let index = 0; index < plan.steps.length; index++) {
      await this.executePlanStep(execution, plan, plan.steps[index], execution.steps[index]);
      execution.progress = Math.round(((index + 1) / plan.steps.length) * 100);
    }

    execution.recoveredServices = Array.from(new Set([
      ...execution.recoveredServices,
      ...this.stateManager.getServicesByTier(execution.deploymentId, 'all')
        .filter(service => service.status === 'running')
        .map(service => service.serviceId)
    ]));

    this.activeRollbacks.delete(execution.id);
    this.logger.info(`Progressive rollback completed for ${execution.deploymentId}`, {
      executionId: execution.id
    });
  }

  async executeTrafficShift(execution: RollbackExecution): Promise<void> {
    const rollbackState = { cancelled: false };
    this.activeRollbacks.set(execution.id, rollbackState);

    const shiftSteps: RollbackStep[] = [
      { id: 'shift-75', name: 'Shift 75% traffic to stable release', status: 'pending' },
      { id: 'shift-50', name: 'Shift 50% traffic to stable release', status: 'pending' },
      { id: 'shift-0', name: 'Drain traffic from unstable release', status: 'pending' },
      { id: 'validate-shift', name: 'Validate traffic shift health', status: 'pending' }
    ];

    execution.steps = shiftSteps;

    const stages = [75, 50, 0];
    for (let index = 0; index < stages.length; index++) {
      const step = shiftSteps[index];
      await this.runShiftStage(execution, step, stages[index]);
      execution.progress = Math.round(((index + 1) / shiftSteps.length) * 100);
    }

    const validationStep = shiftSteps[shiftSteps.length - 1];
    validationStep.status = 'running';
    validationStep.startTime = new Date();
    await this.stateManager.markRecoveryStep(execution.deploymentId, 'validate-platform', 'in_progress');
    const validation = await this.stateManager.validateRecovery(execution.deploymentId, ['all']);
    validationStep.status = validation.healthy ? 'completed' : 'failed';
    validationStep.endTime = new Date();
    validationStep.duration = validationStep.endTime.getTime() - validationStep.startTime.getTime();
    validationStep.output = validation.healthy ? 'Traffic shift validated successfully' : validation.issues.join(', ');

    if (!validation.healthy) {
      throw new Error(`Traffic shift validation failed: ${validation.issues.join(', ')}`);
    }

    execution.progress = 100;
    this.activeRollbacks.delete(execution.id);
    this.emit('trafficShiftCompleted', { execution });
  }

  async cancelRollback(executionId: string): Promise<void> {
    const rollback = this.activeRollbacks.get(executionId);
    if (rollback) {
      rollback.cancelled = true;
      this.logger.warn(`Cancellation requested for rollback ${executionId}`);
    }
  }

  private async ensureRecoveryPlan(deploymentId: string): Promise<RecoveryPlan> {
    let plan = await this.stateManager.getRecoveryPlan(deploymentId);
    if (!plan || plan.steps.length === 0) {
      plan = await this.stateManager.regenerateRecoveryPlan(deploymentId);
    }
    return plan;
  }

  private async executePlanStep(
    execution: RollbackExecution,
    plan: RecoveryPlan,
    planStep: RecoveryPlanStep,
    rollbackStep: RollbackStep
  ): Promise<void> {
    const rollbackState = this.activeRollbacks.get(execution.id);
    if (!rollbackState) {
      throw new Error(`Rollback ${execution.id} not registered`);
    }

    if (rollbackState.cancelled) {
      rollbackStep.status = 'failed';
      throw new Error(`Rollback ${execution.id} cancelled`);
    }

    rollbackStep.status = 'running';
    rollbackStep.startTime = new Date();
    await this.stateManager.markRecoveryStep(execution.deploymentId, planStep.id, 'in_progress');

    try {
      switch (planStep.action) {
        case 'traffic_shift':
          await this.handleTrafficShiftAction(execution, planStep.tier);
          rollbackStep.output = `Traffic shifted for tier ${planStep.tier}`;
          break;
        case 'restore':
          const restored = await this.stateManager.restoreServiceTier(execution.deploymentId, planStep.tier);
          execution.recoveredServices.push(...restored);
          rollbackStep.output = `Restored services: ${restored.join(', ')}`;
          break;
        case 'restart':
          const restarted = await this.restartTier(execution.deploymentId, planStep.tier);
          rollbackStep.output = `Restarted services: ${restarted.map(service => service.serviceId).join(', ')}`;
          break;
        case 'validate':
          const validation = await this.stateManager.validateRecovery(execution.deploymentId, [planStep.tier]);
          rollbackStep.output = validation.healthy ? 'Validation passed' : validation.issues.join(', ');
          if (!validation.healthy) {
            throw new Error(`Validation failed: ${validation.issues.join(', ')}`);
          }
          break;
        default:
          rollbackStep.output = 'No action performed';
      }

      rollbackStep.status = 'completed';
      rollbackStep.endTime = new Date();
      rollbackStep.duration = rollbackStep.endTime.getTime() - rollbackStep.startTime.getTime();
      await this.stateManager.markRecoveryStep(execution.deploymentId, planStep.id, 'completed');
      this.emit('progress', { executionId: execution.id, step: rollbackStep });
    } catch (error) {
      rollbackStep.status = 'failed';
      rollbackStep.endTime = new Date();
      rollbackStep.duration = rollbackStep.endTime.getTime() - rollbackStep.startTime.getTime();
      rollbackStep.error = error instanceof Error ? error.message : String(error);
      await this.stateManager.markRecoveryStep(execution.deploymentId, planStep.id, 'failed');
      throw error;
    }
  }

  private async handleTrafficShiftAction(execution: RollbackExecution, tier: ServiceTier | 'all'): Promise<void> {
    if (tier === 'canary') {
      await this.stateManager.reduceTraffic(execution.deploymentId, 5, 'Drain canary traffic prior to restoration');
    } else {
      await this.stateManager.reduceTraffic(execution.deploymentId, 0, 'Shift all traffic back to stable release');
    }
  }

  private async restartTier(deploymentId: string, tier: ServiceTier | 'all') {
    const services = this.stateManager.getServicesByTier(deploymentId, tier);
    const serviceIds = services.map(service => service.serviceId);
    return this.stateManager.restartServices(deploymentId, serviceIds);
  }

  private async runShiftStage(execution: RollbackExecution, step: RollbackStep, percentage: number): Promise<void> {
    const rollbackState = this.activeRollbacks.get(execution.id);
    if (!rollbackState) {
      throw new Error(`Rollback ${execution.id} not registered`);
    }

    if (rollbackState.cancelled) {
      step.status = 'failed';
      throw new Error(`Rollback ${execution.id} cancelled`);
    }

    step.status = 'running';
    step.startTime = new Date();

    await this.stateManager.reduceTraffic(
      execution.deploymentId,
      percentage,
      `Traffic shift stage targeting ${percentage}% canary load`
    );

    // Allow services to stabilize by validating after each shift
    const validation = await this.stateManager.validateRecovery(execution.deploymentId, ['all']);
    if (!validation.healthy) {
      step.status = 'failed';
      step.endTime = new Date();
      step.duration = step.endTime.getTime() - step.startTime.getTime();
      step.error = validation.issues.join(', ');
      throw new Error(`Traffic shift validation failed: ${validation.issues.join(', ')}`);
    }

    step.status = 'completed';
    step.endTime = new Date();
    step.duration = step.endTime.getTime() - step.startTime.getTime();
    step.output = `Traffic reduced to ${percentage}% canary load`;
    this.emit('progress', { executionId: execution.id, step });
  }
}
