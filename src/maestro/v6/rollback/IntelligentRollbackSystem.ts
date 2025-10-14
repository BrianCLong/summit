import { EventEmitter } from 'events';
import { Logger } from '../../utils/logger';
import { MetricsCollector } from '../../observability/MetricsCollector';
import { HealthMonitor } from './HealthMonitor';
import { StateManager } from './StateManager';
import { RollbackDecisionEngine } from './RollbackDecisionEngine';
import { ProgressiveRollbackManager } from './ProgressiveRollbackManager';

export interface RollbackTrigger {
  id: string;
  name: string;
  condition: RollbackCondition;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldownPeriod?: number; // in seconds
  maxRetries?: number;
}

export interface RollbackCondition {
  type: 'threshold' | 'anomaly' | 'composite' | 'manual';
  metric?: string;
  operator?: '>' | '<' | '>=' | '<=' | '==' | '!=';
  value?: number | string;
  duration?: number; // in seconds
  percentile?: number;
  conditions?: RollbackCondition[]; // for composite conditions
  logicOperator?: 'AND' | 'OR';
}

export interface RollbackDecision {
  deploymentId: string;
  decision: 'rollback' | 'continue' | 'hold';
  strategy: 'immediate' | 'progressive' | 'canary_only' | 'traffic_shift';
  confidence: number;
  reasons: string[];
  triggeredBy: string[];
  estimatedImpact: RollbackImpact;
  timestamp: Date;
}

export interface RollbackImpact {
  affectedServices: string[];
  estimatedDowntime: number; // in seconds
  userImpact: number; // percentage of users affected
  dataLoss: 'none' | 'minimal' | 'moderate' | 'significant';
  rollbackComplexity: 'low' | 'medium' | 'high';
}

export interface RollbackExecution {
  id: string;
  deploymentId: string;
  strategy: string;
  status: 'initiated' | 'in_progress' | 'completed' | 'failed' | 'partial';
  startTime: Date;
  endTime?: Date;
  progress: number; // 0-100
  steps: RollbackStep[];
  stateSnapshot: any;
  errors: string[];
  recoveredServices: string[];
}

export interface RollbackStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  output?: string;
  error?: string;
}

/**
 * Intelligent Rollback System for Maestro v6
 * 
 * Provides automated rollback capabilities with:
 * - Automated rollback triggers and decision making
 * - Health monitoring with intelligent alerting
 * - State preservation and recovery mechanisms
 * - Progressive rollback strategies
 */
export class IntelligentRollbackSystem extends EventEmitter {
  private logger: Logger;
  private metricsCollector: MetricsCollector;
  private healthMonitor: HealthMonitor;
  private stateManager: StateManager;
  private decisionEngine: RollbackDecisionEngine;
  private progressiveManager: ProgressiveRollbackManager;
  
  private triggers: Map<string, RollbackTrigger> = new Map();
  private activeRollbacks: Map<string, RollbackExecution> = new Map();
  private lastTriggerActivation: Map<string, Date> = new Map();
  private isInitialized = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(
    logger: Logger,
    metricsCollector: MetricsCollector,
    healthMonitor: HealthMonitor,
    stateManager: StateManager
  ) {
    super();
    this.logger = logger;
    this.metricsCollector = metricsCollector;
    this.healthMonitor = healthMonitor;
    this.stateManager = stateManager;
    this.decisionEngine = new RollbackDecisionEngine(logger, metricsCollector);
    this.progressiveManager = new ProgressiveRollbackManager(logger, stateManager);
  }

  /**
   * Initialize the Intelligent Rollback System
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Intelligent Rollback System v6...');

      // Initialize sub-components
      await this.healthMonitor.initialize();
      await this.stateManager.initialize();
      await this.decisionEngine.initialize();
      await this.progressiveManager.initialize();

      // Load default rollback triggers
      await this.loadDefaultTriggers();

      // Start monitoring
      await this.startMonitoring();

      // Set up event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      this.logger.info('Intelligent Rollback System v6 initialized successfully');
      
      this.emit('initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Intelligent Rollback System:', error);
      throw error;
    }
  }

  /**
   * Register a deployment for rollback monitoring
   */
  async registerDeployment(deploymentId: string, config: {
    services: string[];
    environment: string;
    rollbackStrategy?: string;
    customTriggers?: RollbackTrigger[];
  }): Promise<void> {
    this.logger.info(`Registering deployment ${deploymentId} for rollback monitoring`);

    try {
      // Create state snapshot before deployment
      const stateSnapshot = await this.stateManager.createSnapshot(deploymentId, config.services);
      this.logger.debug(`Captured pre-deployment snapshot for ${deploymentId}`, {
        snapshotId: stateSnapshot.id,
        checksum: stateSnapshot.checksum,
        services: stateSnapshot.services.length
      });

      // Register with health monitor
      await this.healthMonitor.startMonitoring(deploymentId, config.services);

      // Add custom triggers if provided
      if (config.customTriggers) {
        for (const trigger of config.customTriggers) {
          await this.addTrigger(deploymentId, trigger);
        }
      }

      // Initialize decision engine for this deployment
      await this.decisionEngine.registerDeployment(deploymentId, config);

      this.logger.info(`Deployment ${deploymentId} registered successfully for rollback monitoring`);
      this.emit('deploymentRegistered', { deploymentId, config });

    } catch (error) {
      this.logger.error(`Failed to register deployment ${deploymentId}:`, error);
      throw error;
    }
  }

  /**
   * Add a rollback trigger
   */
  async addTrigger(deploymentId: string, trigger: RollbackTrigger): Promise<void> {
    const triggerKey = `${deploymentId}:${trigger.id}`;
    
    // Validate trigger configuration
    this.validateTrigger(trigger);

    this.triggers.set(triggerKey, trigger);
    
    this.logger.info(`Added rollback trigger: ${trigger.name} for deployment ${deploymentId}`);
    this.emit('triggerAdded', { deploymentId, trigger });
  }

  /**
   * Remove a rollback trigger
   */
  async removeTrigger(deploymentId: string, triggerId: string): Promise<void> {
    const triggerKey = `${deploymentId}:${triggerId}`;
    
    if (this.triggers.delete(triggerKey)) {
      this.logger.info(`Removed rollback trigger: ${triggerId} for deployment ${deploymentId}`);
      this.emit('triggerRemoved', { deploymentId, triggerId });
    }
  }

  /**
   * Evaluate rollback conditions and make decisions
   */
  async evaluateRollbackConditions(deploymentId: string): Promise<RollbackDecision | null> {
    try {
      // Get current health metrics
      const healthMetrics = await this.healthMonitor.getHealthMetrics(deploymentId);
      
      // Get deployment-specific triggers
      const deploymentTriggers = Array.from(this.triggers.entries())
        .filter(([key]) => key.startsWith(`${deploymentId}:`))
        .map(([_, trigger]) => trigger);

      // Evaluate each trigger
      const triggeredConditions: { trigger: RollbackTrigger; reason: string }[] = [];

      for (const trigger of deploymentTriggers) {
        if (!trigger.enabled) continue;

        // Check cooldown period
        const lastActivation = this.lastTriggerActivation.get(`${deploymentId}:${trigger.id}`);
        if (lastActivation && trigger.cooldownPeriod) {
          const timeSinceLastActivation = (Date.now() - lastActivation.getTime()) / 1000;
          if (timeSinceLastActivation < trigger.cooldownPeriod) {
            continue;
          }
        }

        const evaluationResult = await this.evaluateCondition(trigger.condition, healthMetrics);
        if (evaluationResult.triggered) {
          triggeredConditions.push({
            trigger,
            reason: evaluationResult.reason
          });
          
          // Record trigger activation
          this.lastTriggerActivation.set(`${deploymentId}:${trigger.id}`, new Date());
        }
      }

      // If no triggers activated, no rollback needed
      if (triggeredConditions.length === 0) {
        return null;
      }

      // Use decision engine to make rollback decision
      const decision = await this.decisionEngine.makeDecision(
        deploymentId,
        triggeredConditions,
        healthMetrics
      );

      this.logger.info(`Rollback decision made for ${deploymentId}:`, {
        decision: decision.decision,
        strategy: decision.strategy,
        confidence: decision.confidence,
        triggeredBy: decision.triggeredBy
      });

      this.emit('decisionMade', decision);
      return decision;

    } catch (error) {
      this.logger.error(`Failed to evaluate rollback conditions for ${deploymentId}:`, error);
      return null;
    }
  }

  /**
   * Execute a rollback based on the decision
   */
  async executeRollback(decision: RollbackDecision): Promise<RollbackExecution> {
    const executionId = `rollback_${decision.deploymentId}_${Date.now()}`;
    
    this.logger.info(`Executing rollback for deployment ${decision.deploymentId}`, {
      executionId,
      strategy: decision.strategy,
      confidence: decision.confidence
    });

    const execution: RollbackExecution = {
      id: executionId,
      deploymentId: decision.deploymentId,
      strategy: decision.strategy,
      status: 'initiated',
      startTime: new Date(),
      progress: 0,
      steps: [],
      stateSnapshot: await this.stateManager.getSnapshot(decision.deploymentId),
      errors: [],
      recoveredServices: []
    };

    this.activeRollbacks.set(executionId, execution);

    try {
      // Execute based on strategy
      switch (decision.strategy) {
        case 'immediate':
          await this.executeImmediateRollback(execution);
          break;
        case 'progressive':
          await this.executeProgressiveRollback(execution);
          break;
        case 'canary_only':
          await this.executeCanaryRollback(execution);
          break;
        case 'traffic_shift':
          await this.executeTrafficShiftRollback(execution);
          break;
        default:
          throw new Error(`Unknown rollback strategy: ${decision.strategy}`);
      }

      execution.status = 'completed';
      execution.endTime = new Date();
      execution.progress = 100;

      this.logger.info(`Rollback completed successfully for deployment ${decision.deploymentId}`, {
        executionId,
        duration: execution.endTime.getTime() - execution.startTime.getTime(),
        recoveredServices: execution.recoveredServices.length
      });

      this.emit('rollbackCompleted', execution);

    } catch (error) {
      execution.status = 'failed';
      execution.errors.push(error.message);
      
      this.logger.error(`Rollback failed for deployment ${decision.deploymentId}:`, error);
      this.emit('rollbackFailed', { execution, error });
    }

    this.metricsCollector.incrementCounter('rollbacks_executed_total');
    this.metricsCollector.recordHistogram('rollback_duration_seconds', 
      ((execution.endTime?.getTime() || Date.now()) - execution.startTime.getTime()) / 1000);

    return execution;
  }

  /**
   * Get rollback execution status
   */
  getRollbackStatus(executionId: string): RollbackExecution | null {
    return this.activeRollbacks.get(executionId) || null;
  }

  /**
   * Cancel an ongoing rollback
   */
  async cancelRollback(executionId: string, reason: string): Promise<void> {
    const execution = this.activeRollbacks.get(executionId);
    if (!execution || execution.status === 'completed' || execution.status === 'failed') {
      throw new Error(`Cannot cancel rollback ${executionId}: not active`);
    }

    this.logger.info(`Cancelling rollback ${executionId}: ${reason}`);

    try {
      // Stop ongoing operations
      await this.progressiveManager.cancelRollback(executionId);
      
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.errors.push(`Cancelled: ${reason}`);

      this.emit('rollbackCancelled', { executionId, reason });

    } catch (error) {
      this.logger.error(`Failed to cancel rollback ${executionId}:`, error);
      throw error;
    }
  }

  /**
   * Execute immediate rollback strategy
   */
  private async executeImmediateRollback(execution: RollbackExecution): Promise<void> {
    execution.status = 'in_progress';
    
    const steps: RollbackStep[] = [
      { id: 'stop_traffic', name: 'Stop incoming traffic', status: 'pending' },
      { id: 'restore_state', name: 'Restore previous state', status: 'pending' },
      { id: 'restart_services', name: 'Restart services', status: 'pending' },
      { id: 'verify_health', name: 'Verify system health', status: 'pending' },
      { id: 'resume_traffic', name: 'Resume traffic', status: 'pending' }
    ];

    execution.steps = steps;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      step.status = 'running';
      step.startTime = new Date();

      try {
        await this.executeRollbackStep(execution.deploymentId, step);
        step.status = 'completed';
        step.endTime = new Date();
        step.duration = step.endTime.getTime() - step.startTime.getTime();
        
        execution.progress = ((i + 1) / steps.length) * 100;
        
        this.emit('rollbackProgress', { execution, step });

      } catch (error) {
        step.status = 'failed';
        step.error = error.message;
        execution.errors.push(`Step ${step.name} failed: ${error.message}`);
        throw error;
      }
    }
  }

  /**
   * Execute progressive rollback strategy
   */
  private async executeProgressiveRollback(execution: RollbackExecution): Promise<void> {
    execution.status = 'in_progress';
    
    try {
      await this.progressiveManager.executeProgressiveRollback(execution);
    } catch (error) {
      execution.errors.push(`Progressive rollback failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute canary-only rollback strategy
   */
  private async executeCanaryRollback(execution: RollbackExecution): Promise<void> {
    execution.status = 'in_progress';
    
    const step: RollbackStep = {
      id: 'rollback_canary',
      name: 'Rollback canary instances only',
      status: 'running',
      startTime: new Date()
    };

    execution.steps = [step];

    try {
      // Rollback only canary instances
      await this.stateManager.rollbackCanaryInstances(execution.deploymentId);
      
      step.status = 'completed';
      step.endTime = new Date();
      step.duration = step.endTime.getTime() - step.startTime.getTime();
      execution.progress = 100;

      this.emit('rollbackProgress', { execution, step });

    } catch (error) {
      step.status = 'failed';
      step.error = error.message;
      throw error;
    }
  }

  /**
   * Execute traffic shift rollback strategy
   */
  private async executeTrafficShiftRollback(execution: RollbackExecution): Promise<void> {
    execution.status = 'in_progress';
    
    const steps: RollbackStep[] = [
      { id: 'shift_traffic', name: 'Shift traffic to previous version', status: 'pending' },
      { id: 'monitor_health', name: 'Monitor health during shift', status: 'pending' },
      { id: 'complete_shift', name: 'Complete traffic shift', status: 'pending' }
    ];

    execution.steps = steps;

    try {
      // Gradually shift traffic back to previous version
      await this.progressiveManager.executeTrafficShift(execution);
      
      execution.progress = 100;
      this.emit('rollbackProgress', { execution });

    } catch (error) {
      execution.errors.push(`Traffic shift rollback failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute individual rollback step
   */
  private async executeRollbackStep(deploymentId: string, step: RollbackStep): Promise<void> {
    switch (step.id) {
      case 'stop_traffic':
        await this.stateManager.stopTraffic(deploymentId);
        step.output = 'Traffic stopped successfully';
        break;
        
      case 'restore_state':
        await this.stateManager.restoreState(deploymentId);
        step.output = 'State restored successfully';
        break;
        
      case 'restart_services':
        const services = await this.stateManager.restartServices(deploymentId);
        step.output = `Restarted ${services.length} services`;
        break;
        
      case 'verify_health':
        const isHealthy = await this.healthMonitor.verifyHealth(deploymentId);
        if (!isHealthy) {
          throw new Error('Health verification failed');
        }
        step.output = 'Health verification passed';
        break;
        
      case 'resume_traffic':
        await this.stateManager.resumeTraffic(deploymentId);
        step.output = 'Traffic resumed successfully';
        break;
        
      default:
        throw new Error(`Unknown rollback step: ${step.id}`);
    }
  }

  /**
   * Evaluate a rollback condition
   */
  private async evaluateCondition(
    condition: RollbackCondition,
    metrics: Record<string, any>
  ): Promise<{ triggered: boolean; reason: string }> {
    switch (condition.type) {
      case 'threshold':
        return this.evaluateThresholdCondition(condition, metrics);
        
      case 'anomaly':
        return this.evaluateAnomalyCondition(condition, metrics);
        
      case 'composite':
        return this.evaluateCompositeCondition(condition, metrics);
        
      case 'manual':
        return { triggered: false, reason: 'Manual trigger not activated' };
        
      default:
        return { triggered: false, reason: 'Unknown condition type' };
    }
  }

  /**
   * Evaluate threshold-based condition
   */
  private async evaluateThresholdCondition(
    condition: RollbackCondition,
    metrics: Record<string, any>
  ): Promise<{ triggered: boolean; reason: string }> {
    if (!condition.metric || condition.value === undefined) {
      return { triggered: false, reason: 'Invalid threshold condition configuration' };
    }

    const metricValue = metrics[condition.metric];
    if (metricValue === undefined) {
      return { triggered: false, reason: `Metric ${condition.metric} not found` };
    }

    let triggered = false;
    const operator = condition.operator || '>';
    
    switch (operator) {
      case '>':
        triggered = metricValue > condition.value;
        break;
      case '<':
        triggered = metricValue < condition.value;
        break;
      case '>=':
        triggered = metricValue >= condition.value;
        break;
      case '<=':
        triggered = metricValue <= condition.value;
        break;
      case '==':
        triggered = metricValue === condition.value;
        break;
      case '!=':
        triggered = metricValue !== condition.value;
        break;
    }

    return {
      triggered,
      reason: triggered ? 
        `${condition.metric} (${metricValue}) ${operator} ${condition.value}` :
        `Threshold not exceeded: ${condition.metric} = ${metricValue}`
    };
  }

  /**
   * Evaluate anomaly-based condition
   */
  private async evaluateAnomalyCondition(
    condition: RollbackCondition,
    metrics: Record<string, any>
  ): Promise<{ triggered: boolean; reason: string }> {
    // This would integrate with anomaly detection algorithms
    // For now, simplified implementation
    const anomalyScore = metrics.anomalyScore || 0;
    const threshold = 0.8;
    
    return {
      triggered: anomalyScore > threshold,
      reason: anomalyScore > threshold ?
        `Anomaly detected with score ${anomalyScore}` :
        `No significant anomaly detected (score: ${anomalyScore})`
    };
  }

  /**
   * Evaluate composite condition
   */
  private async evaluateCompositeCondition(
    condition: RollbackCondition,
    metrics: Record<string, any>
  ): Promise<{ triggered: boolean; reason: string }> {
    if (!condition.conditions || condition.conditions.length === 0) {
      return { triggered: false, reason: 'No sub-conditions defined' };
    }

    const results = await Promise.all(
      condition.conditions.map(subCondition => 
        this.evaluateCondition(subCondition, metrics)
      )
    );

    const logicOperator = condition.logicOperator || 'OR';
    let triggered = false;
    
    if (logicOperator === 'AND') {
      triggered = results.every(r => r.triggered);
    } else {
      triggered = results.some(r => r.triggered);
    }

    return {
      triggered,
      reason: `Composite condition (${logicOperator}): ${results.map(r => r.reason).join(', ')}`
    };
  }

  /**
   * Validate trigger configuration
   */
  private validateTrigger(trigger: RollbackTrigger): void {
    if (!trigger.id || !trigger.name) {
      throw new Error('Trigger must have id and name');
    }

    if (!trigger.condition) {
      throw new Error('Trigger must have a condition');
    }

    // Additional validation based on condition type
    if (trigger.condition.type === 'threshold') {
      if (!trigger.condition.metric || trigger.condition.value === undefined) {
        throw new Error('Threshold condition must have metric and value');
      }
    }
  }

  /**
   * Load default rollback triggers
   */
  private async loadDefaultTriggers(): Promise<void> {
    const defaultTriggers: RollbackTrigger[] = [
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        condition: {
          type: 'threshold',
          metric: 'error_rate',
          operator: '>',
          value: 0.05,
          duration: 60
        },
        severity: 'high',
        enabled: true,
        cooldownPeriod: 300
      },
      {
        id: 'low_success_rate',
        name: 'Low Success Rate',
        condition: {
          type: 'threshold',
          metric: 'success_rate',
          operator: '<',
          value: 0.95,
          duration: 120
        },
        severity: 'high',
        enabled: true,
        cooldownPeriod: 300
      },
      {
        id: 'high_latency',
        name: 'High Response Latency',
        condition: {
          type: 'threshold',
          metric: 'avg_latency',
          operator: '>',
          value: 2000,
          duration: 180,
          percentile: 95
        },
        severity: 'medium',
        enabled: true,
        cooldownPeriod: 600
      },
      {
        id: 'memory_exhaustion',
        name: 'Memory Exhaustion',
        condition: {
          type: 'threshold',
          metric: 'memory_usage',
          operator: '>',
          value: 0.9,
          duration: 300
        },
        severity: 'critical',
        enabled: true,
        cooldownPeriod: 180
      }
    ];

    // Store as global triggers (will be applied to all deployments)
    for (const trigger of defaultTriggers) {
      this.triggers.set(`global:${trigger.id}`, trigger);
    }

    this.logger.info(`Loaded ${defaultTriggers.length} default rollback triggers`);
  }

  /**
   * Start monitoring for rollback conditions
   */
  private async startMonitoring(): Promise<void> {
    this.monitoringInterval = setInterval(async () => {
      try {
        // Get all active deployments
        const activeDeployments = await this.getActiveDeployments();
        
        for (const deploymentId of activeDeployments) {
          const decision = await this.evaluateRollbackConditions(deploymentId);
          
          if (decision && decision.decision === 'rollback') {
            this.logger.warn(`Automatic rollback triggered for ${deploymentId}`, {
              confidence: decision.confidence,
              reasons: decision.reasons
            });
            
            await this.executeRollback(decision);
          }
        }
      } catch (error) {
        this.logger.error('Error during rollback monitoring:', error);
      }
    }, 30000); // Monitor every 30 seconds

    this.logger.info('Rollback monitoring started');
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.healthMonitor.on('healthDegraded', async (event) => {
      this.logger.info(`Health degraded for deployment ${event.deploymentId}`, event);
      
      // Trigger rollback evaluation
      const decision = await this.evaluateRollbackConditions(event.deploymentId);
      if (decision && decision.decision === 'rollback') {
        await this.executeRollback(decision);
      }
    });

    this.healthMonitor.on('criticalAlert', async (event) => {
      this.logger.error(`Critical alert for deployment ${event.deploymentId}`, event);
      
      // Force immediate rollback evaluation
      const decision = await this.evaluateRollbackConditions(event.deploymentId);
      if (decision) {
        decision.strategy = 'immediate'; // Override to immediate for critical issues
        await this.executeRollback(decision);
      }
    });
  }

  /**
   * Get list of active deployments being monitored
   */
  private async getActiveDeployments(): Promise<string[]> {
    return Array.from(new Set(
      Array.from(this.triggers.keys())
        .filter(key => key !== 'global')
        .map(key => key.split(':')[0])
    ));
  }

  /**
   * Get system statistics
   */
  getSystemStats(): {
    totalTriggers: number;
    activeTriggers: number;
    activeRollbacks: number;
    completedRollbacks: number;
    failedRollbacks: number;
  } {
    const activeTriggers = Array.from(this.triggers.values()).filter(t => t.enabled).length;
    const activeRollbacks = Array.from(this.activeRollbacks.values())
      .filter(r => r.status === 'in_progress' || r.status === 'initiated').length;
    const completedRollbacks = Array.from(this.activeRollbacks.values())
      .filter(r => r.status === 'completed').length;
    const failedRollbacks = Array.from(this.activeRollbacks.values())
      .filter(r => r.status === 'failed').length;

    return {
      totalTriggers: this.triggers.size,
      activeTriggers,
      activeRollbacks,
      completedRollbacks,
      failedRollbacks
    };
  }

  /**
   * Clean up completed rollbacks older than specified time
   */
  async cleanupOldRollbacks(olderThanHours = 24): Promise<number> {
    const cutoffTime = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000));
    let cleanedCount = 0;

    for (const [id, execution] of this.activeRollbacks.entries()) {
      if (execution.endTime && execution.endTime < cutoffTime && 
          (execution.status === 'completed' || execution.status === 'failed')) {
        this.activeRollbacks.delete(id);
        cleanedCount++;
      }
    }

    this.logger.info(`Cleaned up ${cleanedCount} old rollback executions`);
    return cleanedCount;
  }

  /**
   * Shutdown the rollback system
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Intelligent Rollback System...');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Cancel any ongoing rollbacks
    const activeRollbacks = Array.from(this.activeRollbacks.entries())
      .filter(([_, execution]) => execution.status === 'in_progress');

    for (const [id, _] of activeRollbacks) {
      try {
        await this.cancelRollback(id, 'System shutdown');
      } catch (error) {
        this.logger.error(`Failed to cancel rollback ${id} during shutdown:`, error);
      }
    }

    this.isInitialized = false;
    this.logger.info('Intelligent Rollback System shut down');
  }
}