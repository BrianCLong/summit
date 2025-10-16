import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import { Logger } from '../../utils/logger';

export type ServiceTier = 'canary' | 'primary' | 'standby';

export interface ServiceState {
  serviceId: string;
  version: string;
  status: 'running' | 'stopped' | 'degraded';
  tier: ServiceTier;
  replicas: number;
  configHash: string;
  lastUpdated: Date;
  metadata: Record<string, any>;
}

export interface TrafficPolicy {
  mode: 'normal' | 'stopped' | 'canary' | 'shift';
  canaryPercentage: number;
  primaryPercentage: number;
  notes?: string;
}

export interface DeploymentSnapshot {
  id: string;
  deploymentId: string;
  createdAt: Date;
  createdBy: string;
  reason: string;
  checksum: string;
  services: ServiceState[];
  trafficPolicy: TrafficPolicy;
  metadata: Record<string, any>;
}

export interface RecoveryPlanStep {
  id: string;
  name: string;
  description: string;
  tier: ServiceTier | 'all';
  action: 'traffic_shift' | 'restore' | 'restart' | 'validate';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  dependencies: string[];
}

export interface RecoveryPlan {
  deploymentId: string;
  snapshotId: string;
  createdAt: Date;
  steps: RecoveryPlanStep[];
  lastUpdated: Date;
}

export interface RecoveryValidation {
  healthy: boolean;
  failingServices: string[];
  issues: string[];
}

interface RecoveryActionLog {
  id: string;
  action: string;
  timestamp: Date;
  status: 'success' | 'failed';
  details?: Record<string, any>;
}

interface DeploymentRuntimeState {
  deploymentId: string;
  services: Map<string, ServiceState>;
  snapshots: DeploymentSnapshot[];
  trafficPolicy: TrafficPolicy;
  recoveryPlan?: RecoveryPlan;
  recoveryLog: RecoveryActionLog[];
  createdAt: Date;
}

const SNAPSHOT_HISTORY_LIMIT = 10;

export class StateManager extends EventEmitter {
  private logger: Logger;
  private deployments: Map<string, DeploymentRuntimeState> = new Map();

  constructor(logger: Logger) {
    super();
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    this.logger.info(
      'StateManager initialized for Maestro Conductor rollback safeguards',
    );
  }

  async createSnapshot(
    deploymentId: string,
    services: string[],
  ): Promise<DeploymentSnapshot> {
    const state = this.ensureDeployment(deploymentId, services);
    const snapshotServices = Array.from(state.services.values()).map(
      (service) => ({
        ...service,
        lastUpdated: new Date(service.lastUpdated),
      }),
    );

    const snapshot: DeploymentSnapshot = {
      id: `${deploymentId}-snapshot-${Date.now()}`,
      deploymentId,
      createdAt: new Date(),
      createdBy: 'rollback-system',
      reason: 'Pre-deployment safety snapshot',
      checksum: this.calculateChecksum(snapshotServices, state.trafficPolicy),
      services: snapshotServices,
      trafficPolicy: { ...state.trafficPolicy },
      metadata: {
        serviceCount: snapshotServices.length,
        replicas: snapshotServices.reduce(
          (sum, service) => sum + service.replicas,
          0,
        ),
      },
    };

    state.snapshots.push(snapshot);
    if (state.snapshots.length > SNAPSHOT_HISTORY_LIMIT) {
      state.snapshots.shift();
    }

    state.recoveryPlan = this.buildRecoveryPlan(snapshot);
    state.recoveryLog.push({
      id: `${snapshot.id}-recorded`,
      action: 'snapshot_created',
      timestamp: new Date(),
      status: 'success',
      details: { checksum: snapshot.checksum },
    });

    this.emit('snapshotCreated', snapshot);
    this.logger.info(`Created deployment snapshot ${snapshot.id}`, {
      deploymentId,
      checksum: snapshot.checksum,
      services: snapshot.services.length,
    });

    return snapshot;
  }

  async getSnapshot(deploymentId: string): Promise<DeploymentSnapshot | null> {
    const state = this.deployments.get(deploymentId);
    if (!state || state.snapshots.length === 0) {
      return null;
    }

    return state.snapshots[state.snapshots.length - 1];
  }

  async listSnapshots(deploymentId: string): Promise<DeploymentSnapshot[]> {
    const state = this.deployments.get(deploymentId);
    if (!state) {
      return [];
    }
    return [...state.snapshots];
  }

  async getRecoveryPlan(deploymentId: string): Promise<RecoveryPlan | null> {
    const state = this.deployments.get(deploymentId);
    return state?.recoveryPlan || null;
  }

  async regenerateRecoveryPlan(deploymentId: string): Promise<RecoveryPlan> {
    const state = this.deployments.get(deploymentId);
    if (!state) {
      throw new Error(`Deployment ${deploymentId} has no tracked state`);
    }

    const snapshot = await this.getSnapshot(deploymentId);
    if (!snapshot) {
      throw new Error(`No snapshot available for deployment ${deploymentId}`);
    }

    state.recoveryPlan = this.buildRecoveryPlan(snapshot);
    state.recoveryPlan.lastUpdated = new Date();
    this.emit('recoveryPlanRegenerated', {
      deploymentId,
      snapshotId: snapshot.id,
    });

    return state.recoveryPlan;
  }

  async restoreState(deploymentId: string): Promise<void> {
    const state = this.deployments.get(deploymentId);
    if (!state) {
      throw new Error(`Deployment ${deploymentId} has no tracked state`);
    }

    const snapshot = await this.getSnapshot(deploymentId);
    if (!snapshot) {
      throw new Error(`No snapshot available for deployment ${deploymentId}`);
    }

    for (const service of snapshot.services) {
      state.services.set(service.serviceId, {
        ...service,
        lastUpdated: new Date(),
      });
    }

    state.trafficPolicy = { ...snapshot.trafficPolicy };
    this.recordAction(state, 'restore_state', 'success', {
      snapshotId: snapshot.id,
    });
    this.emit('stateRestored', { deploymentId, snapshotId: snapshot.id });

    this.logger.info(`Restored deployment ${deploymentId} from snapshot`, {
      snapshotId: snapshot.id,
      checksum: snapshot.checksum,
    });
  }

  async restoreServiceTier(
    deploymentId: string,
    tier: ServiceTier | 'all',
  ): Promise<string[]> {
    const state = this.deployments.get(deploymentId);
    if (!state) {
      throw new Error(`Deployment ${deploymentId} has no tracked state`);
    }

    const snapshot = await this.getSnapshot(deploymentId);
    if (!snapshot) {
      throw new Error(`No snapshot available for deployment ${deploymentId}`);
    }

    const targetServices = snapshot.services.filter((service) =>
      tier === 'all' ? true : service.tier === tier,
    );
    const restored: string[] = [];

    for (const service of targetServices) {
      state.services.set(service.serviceId, {
        ...service,
        lastUpdated: new Date(),
      });
      restored.push(service.serviceId);
    }

    this.recordAction(state, 'restore_service_tier', 'success', {
      tier,
      restored,
    });
    this.emit('serviceTierRestored', { deploymentId, tier, restored });

    return restored;
  }

  async rollbackCanaryInstances(deploymentId: string): Promise<ServiceState[]> {
    const state = this.deployments.get(deploymentId);
    if (!state) {
      throw new Error(`Deployment ${deploymentId} has no tracked state`);
    }

    const restored = await this.restoreServiceTier(deploymentId, 'canary');
    this.logger.warn(`Rolled back canary instances for ${deploymentId}`, {
      services: restored,
    });

    return restored.map((serviceId) => state.services.get(serviceId)!);
  }

  async restartServices(
    deploymentId: string,
    services?: string[],
  ): Promise<ServiceState[]> {
    const state = this.deployments.get(deploymentId);
    if (!state) {
      throw new Error(`Deployment ${deploymentId} has no tracked state`);
    }

    const targetServices =
      services && services.length > 0
        ? services
        : Array.from(state.services.keys());
    const restarted: ServiceState[] = [];

    for (const serviceId of targetServices) {
      const service = state.services.get(serviceId);
      if (!service) continue;

      const updated: ServiceState = {
        ...service,
        status: 'running',
        lastUpdated: new Date(),
        metadata: {
          ...service.metadata,
          restartedAt: new Date().toISOString(),
        },
      };

      state.services.set(serviceId, updated);
      restarted.push(updated);
    }

    this.recordAction(state, 'restart_services', 'success', {
      services: targetServices,
    });
    this.emit('servicesRestarted', { deploymentId, services: targetServices });

    return restarted;
  }

  async stopTraffic(deploymentId: string): Promise<void> {
    const state = this.deployments.get(deploymentId);
    if (!state) {
      throw new Error(`Deployment ${deploymentId} has no tracked state`);
    }

    state.trafficPolicy = {
      mode: 'stopped',
      canaryPercentage: 0,
      primaryPercentage: 0,
      notes: 'Traffic halted for rollback',
    };

    this.recordAction(state, 'stop_traffic', 'success', {});
    this.emit('trafficUpdated', { deploymentId, policy: state.trafficPolicy });
  }

  async resumeTraffic(deploymentId: string): Promise<void> {
    const state = this.deployments.get(deploymentId);
    if (!state) {
      throw new Error(`Deployment ${deploymentId} has no tracked state`);
    }

    state.trafficPolicy = {
      mode: 'normal',
      canaryPercentage: 0,
      primaryPercentage: 100,
      notes: 'Traffic restored after rollback',
    };

    this.recordAction(state, 'resume_traffic', 'success', {});
    this.emit('trafficUpdated', { deploymentId, policy: state.trafficPolicy });
  }

  async reduceTraffic(
    deploymentId: string,
    canaryPercentage: number,
    note?: string,
  ): Promise<void> {
    const state = this.deployments.get(deploymentId);
    if (!state) {
      throw new Error(`Deployment ${deploymentId} has no tracked state`);
    }

    state.trafficPolicy = {
      mode: 'shift',
      canaryPercentage,
      primaryPercentage: Math.max(0, 100 - canaryPercentage),
      notes: note || 'Progressive rollback traffic shift',
    };

    this.recordAction(state, 'traffic_shift', 'success', { canaryPercentage });
    this.emit('trafficUpdated', { deploymentId, policy: state.trafficPolicy });
  }

  async validateRecovery(
    deploymentId: string,
    tiers: (ServiceTier | 'all')[] = ['all'],
  ): Promise<RecoveryValidation> {
    const state = this.deployments.get(deploymentId);
    if (!state) {
      throw new Error(`Deployment ${deploymentId} has no tracked state`);
    }

    const snapshot = await this.getSnapshot(deploymentId);
    if (!snapshot) {
      throw new Error(`No snapshot available for deployment ${deploymentId}`);
    }

    const failingServices: string[] = [];
    const issues: string[] = [];

    for (const tier of tiers) {
      const services = Array.from(state.services.values()).filter((service) =>
        tier === 'all' ? true : service.tier === tier,
      );
      for (const service of services) {
        if (service.status !== 'running') {
          failingServices.push(service.serviceId);
          issues.push(`${service.serviceId} in tier ${tier} not running`);
        }

        const baseline = snapshot.services.find(
          (s) => s.serviceId === service.serviceId,
        );
        if (baseline && baseline.version !== service.version) {
          issues.push(
            `${service.serviceId} version mismatch: expected ${baseline.version}, found ${service.version}`,
          );
        }
      }
    }

    const healthy = failingServices.length === 0 && issues.length === 0;

    this.recordAction(
      state,
      'validate_recovery',
      healthy ? 'success' : 'failed',
      {
        tiers,
        issues,
        failingServices,
      },
    );

    return {
      healthy,
      failingServices,
      issues,
    };
  }

  async markRecoveryStep(
    deploymentId: string,
    stepId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'failed',
  ): Promise<void> {
    const state = this.deployments.get(deploymentId);
    if (!state || !state.recoveryPlan) {
      return;
    }

    const step = state.recoveryPlan.steps.find((item) => item.id === stepId);
    if (!step) {
      return;
    }

    step.status = status;
    state.recoveryPlan.lastUpdated = new Date();
    this.emit('recoveryStepUpdated', { deploymentId, stepId, status });
  }

  getServicesByTier(
    deploymentId: string,
    tier: ServiceTier | 'all',
  ): ServiceState[] {
    const state = this.deployments.get(deploymentId);
    if (!state) {
      return [];
    }

    const services = Array.from(state.services.values());
    return tier === 'all'
      ? services
      : services.filter((service) => service.tier === tier);
  }

  private ensureDeployment(
    deploymentId: string,
    services: string[],
  ): DeploymentRuntimeState {
    let state = this.deployments.get(deploymentId);
    if (!state) {
      state = {
        deploymentId,
        services: new Map(),
        snapshots: [],
        trafficPolicy: {
          mode: 'normal',
          canaryPercentage: 0,
          primaryPercentage: 100,
        },
        recoveryLog: [],
        createdAt: new Date(),
      };
      this.deployments.set(deploymentId, state);
    }

    for (let index = 0; index < services.length; index++) {
      const serviceId = services[index];
      if (!state.services.has(serviceId)) {
        state.services.set(
          serviceId,
          this.createDefaultServiceState(
            serviceId,
            index === 0 ? 'canary' : 'primary',
          ),
        );
      }
    }

    return state;
  }

  private createDefaultServiceState(
    serviceId: string,
    tier: ServiceTier,
  ): ServiceState {
    return {
      serviceId,
      version: 'baseline',
      status: 'running',
      tier,
      replicas: tier === 'canary' ? 1 : 3,
      configHash: this.calculateConfigHash(serviceId, tier),
      lastUpdated: new Date(),
      metadata: {
        createdFrom: 'default',
        tier,
      },
    };
  }

  private calculateChecksum(
    services: ServiceState[],
    trafficPolicy: TrafficPolicy,
  ): string {
    const hash = createHash('sha256');
    hash.update(JSON.stringify({ services, trafficPolicy }));
    return hash.digest('hex');
  }

  private calculateConfigHash(serviceId: string, tier: ServiceTier): string {
    const hash = createHash('md5');
    hash.update(`${serviceId}:${tier}:${Date.now()}`);
    return hash.digest('hex');
  }

  private buildRecoveryPlan(snapshot: DeploymentSnapshot): RecoveryPlan {
    const steps: RecoveryPlanStep[] = [
      {
        id: 'drain-canary-traffic',
        name: 'Drain canary traffic',
        description:
          'Shift traffic away from canary instances before restoration',
        tier: 'canary',
        action: 'traffic_shift',
        status: 'pending',
        dependencies: [],
      },
      {
        id: 'restore-canary',
        name: 'Restore canary services',
        description: 'Recover canary services using last known-good snapshot',
        tier: 'canary',
        action: 'restore',
        status: 'pending',
        dependencies: ['drain-canary-traffic'],
      },
      {
        id: 'validate-canary',
        name: 'Validate canary health',
        description: 'Verify canary services before expanding rollback',
        tier: 'canary',
        action: 'validate',
        status: 'pending',
        dependencies: ['restore-canary'],
      },
      {
        id: 'restore-primary',
        name: 'Restore primary services',
        description: 'Rollback remaining primary services',
        tier: 'primary',
        action: 'restore',
        status: 'pending',
        dependencies: ['validate-canary'],
      },
      {
        id: 'restart-primary',
        name: 'Restart primary services',
        description:
          'Ensure all primary services are running on restored version',
        tier: 'primary',
        action: 'restart',
        status: 'pending',
        dependencies: ['restore-primary'],
      },
      {
        id: 'validate-platform',
        name: 'Validate platform health',
        description: 'Confirm overall system health before resuming traffic',
        tier: 'all',
        action: 'validate',
        status: 'pending',
        dependencies: ['restart-primary'],
      },
    ];

    return {
      deploymentId: snapshot.deploymentId,
      snapshotId: snapshot.id,
      createdAt: new Date(),
      steps,
      lastUpdated: new Date(),
    };
  }

  private recordAction(
    state: DeploymentRuntimeState,
    action: string,
    status: 'success' | 'failed',
    details: Record<string, any>,
  ): void {
    state.recoveryLog.push({
      id: `${action}-${Date.now()}`,
      action,
      status,
      timestamp: new Date(),
      details,
    });
  }
}
