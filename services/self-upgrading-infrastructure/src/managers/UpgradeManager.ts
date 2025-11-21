import { v4 as uuid } from 'uuid';
import { EventEmitter } from 'events';
import * as semver from 'semver';
import type {
  UpgradeRequest,
  UpgradeStatus,
  UpgradeComponent,
  UpgradePolicy,
  SystemHealth,
  MarketTrend,
  CompetitiveThreat,
  RegulatoryChange,
} from '../types/index.js';
import { logger } from '../utils/logger.js';

interface ComponentVersion {
  component: UpgradeComponent;
  currentVersion: string;
  latestVersion: string;
  availableVersions: string[];
}

export class UpgradeManager extends EventEmitter {
  private policy: UpgradePolicy;
  private upgradeQueue: Map<string, UpgradeRequest> = new Map();
  private componentVersions: Map<UpgradeComponent, ComponentVersion> = new Map();
  private activeUpgrades: Set<string> = new Set();

  constructor(policy: UpgradePolicy) {
    super();
    this.policy = policy;
    this.initializeComponentVersions();
  }

  private initializeComponentVersions(): void {
    const components: UpgradeComponent[] = [
      'algorithm', 'security', 'ux', 'infrastructure', 'database', 'api', 'monitoring'
    ];

    for (const component of components) {
      this.componentVersions.set(component, {
        component,
        currentVersion: '1.0.0',
        latestVersion: '1.0.0',
        availableVersions: ['1.0.0'],
      });
    }
  }

  async createUpgradeFromTrend(trend: MarketTrend): Promise<UpgradeRequest | null> {
    const component = this.mapTrendToComponent(trend.category);
    if (!component) return null;

    const componentVersion = this.componentVersions.get(component);
    if (!componentVersion) return null;

    const targetVersion = semver.inc(componentVersion.currentVersion, 'minor') || '1.1.0';

    const upgrade: UpgradeRequest = {
      id: uuid(),
      component,
      currentVersion: componentVersion.currentVersion,
      targetVersion,
      trigger: 'market_trend',
      triggerId: trend.id,
      priority: this.mapImpactToPriority(trend.impact),
      status: 'pending',
      createdAt: new Date(),
      rollbackAvailable: true,
      metadata: { trend: trend.signal },
    };

    return this.queueUpgrade(upgrade);
  }

  async createUpgradeFromThreat(threat: CompetitiveThreat): Promise<UpgradeRequest | null> {
    const component = this.mapThreatToComponent(threat.threatType);
    if (!component) return null;

    const componentVersion = this.componentVersions.get(component);
    if (!componentVersion) return null;

    const targetVersion = semver.inc(componentVersion.currentVersion, 'minor') || '1.1.0';

    const upgrade: UpgradeRequest = {
      id: uuid(),
      component,
      currentVersion: componentVersion.currentVersion,
      targetVersion,
      trigger: 'competitive_threat',
      triggerId: threat.id,
      priority: threat.severity === 'critical' ? 'critical' : threat.severity === 'high' ? 'high' : 'medium',
      status: 'pending',
      createdAt: new Date(),
      scheduledAt: threat.responseDeadline,
      rollbackAvailable: true,
      metadata: { threat: threat.description },
    };

    return this.queueUpgrade(upgrade);
  }

  async createUpgradeFromRegulatory(change: RegulatoryChange): Promise<UpgradeRequest[]> {
    const upgrades: UpgradeRequest[] = [];

    for (const affectedComponent of change.affectedComponents) {
      const component = this.normalizeComponent(affectedComponent);
      if (!component) continue;

      const componentVersion = this.componentVersions.get(component);
      if (!componentVersion) continue;

      const targetVersion = semver.inc(componentVersion.currentVersion, 'patch') || '1.0.1';

      const upgrade: UpgradeRequest = {
        id: uuid(),
        component,
        currentVersion: componentVersion.currentVersion,
        targetVersion,
        trigger: 'regulatory_change',
        triggerId: change.id,
        priority: change.impact === 'transformational' ? 'critical' : 'high',
        status: 'pending',
        createdAt: new Date(),
        scheduledAt: new Date(change.complianceDeadline.getTime() - 7 * 24 * 60 * 60 * 1000),
        rollbackAvailable: false,
        metadata: { regulation: change.regulation, jurisdiction: change.jurisdiction },
      };

      const queued = await this.queueUpgrade(upgrade);
      if (queued) upgrades.push(queued);
    }

    return upgrades;
  }

  private async queueUpgrade(upgrade: UpgradeRequest): Promise<UpgradeRequest | null> {
    // Check for duplicate upgrades
    for (const existing of this.upgradeQueue.values()) {
      if (
        existing.component === upgrade.component &&
        existing.targetVersion === upgrade.targetVersion &&
        existing.status !== 'completed' &&
        existing.status !== 'failed'
      ) {
        logger.debug(`Duplicate upgrade request for ${upgrade.component} to ${upgrade.targetVersion}`);
        return null;
      }
    }

    this.upgradeQueue.set(upgrade.id, upgrade);
    logger.info(`Queued upgrade: ${upgrade.component} ${upgrade.currentVersion} -> ${upgrade.targetVersion}`, {
      id: upgrade.id,
      trigger: upgrade.trigger,
      priority: upgrade.priority,
    });

    this.emit('upgrade_queued', upgrade);

    if (this.policy.autoUpgrade && !this.policy.requireApproval) {
      await this.processUpgrade(upgrade.id);
    }

    return upgrade;
  }

  async processUpgrade(upgradeId: string): Promise<boolean> {
    const upgrade = this.upgradeQueue.get(upgradeId);
    if (!upgrade) {
      logger.error(`Upgrade not found: ${upgradeId}`);
      return false;
    }

    if (this.activeUpgrades.size >= this.policy.maxConcurrentUpgrades) {
      logger.warn(`Max concurrent upgrades reached, deferring: ${upgradeId}`);
      return false;
    }

    if (!this.isWithinMaintenanceWindow()) {
      logger.info(`Outside maintenance window, scheduling upgrade: ${upgradeId}`);
      upgrade.scheduledAt = this.getNextMaintenanceWindow();
      return false;
    }

    this.activeUpgrades.add(upgradeId);
    upgrade.status = 'analyzing';
    upgrade.startedAt = new Date();

    try {
      // Pre-upgrade health check
      logger.info(`Running pre-upgrade analysis for ${upgrade.component}`);
      const preHealth = await this.checkComponentHealth(upgrade.component);
      if (preHealth.status === 'unhealthy') {
        throw new Error(`Component ${upgrade.component} is unhealthy, aborting upgrade`);
      }

      // Execute upgrade
      upgrade.status = 'in_progress';
      this.emit('upgrade_started', upgrade);
      await this.executeUpgrade(upgrade);

      // Post-upgrade validation
      upgrade.status = 'validating';
      const validationResults = await this.validateUpgrade(upgrade);
      upgrade.validationResults = validationResults;

      const validationPassed = Object.values(validationResults).every(v => v);
      if (!validationPassed) {
        if (upgrade.rollbackAvailable) {
          await this.rollbackUpgrade(upgrade);
          return false;
        }
        throw new Error('Validation failed and rollback not available');
      }

      // Update component version
      const componentVersion = this.componentVersions.get(upgrade.component);
      if (componentVersion) {
        componentVersion.currentVersion = upgrade.targetVersion;
      }

      upgrade.status = 'completed';
      upgrade.completedAt = new Date();
      logger.info(`Upgrade completed: ${upgrade.component} -> ${upgrade.targetVersion}`);
      this.emit('upgrade_completed', upgrade);

      return true;
    } catch (error) {
      logger.error(`Upgrade failed: ${upgradeId}`, { error });
      upgrade.status = 'failed';
      this.emit('upgrade_failed', upgrade, error);
      return false;
    } finally {
      this.activeUpgrades.delete(upgradeId);
    }
  }

  private async executeUpgrade(upgrade: UpgradeRequest): Promise<void> {
    logger.info(`Executing upgrade: ${upgrade.component} ${upgrade.currentVersion} -> ${upgrade.targetVersion}`);

    // Component-specific upgrade logic
    switch (upgrade.component) {
      case 'algorithm':
        await this.upgradeAlgorithms(upgrade);
        break;
      case 'security':
        await this.upgradeSecurityComponents(upgrade);
        break;
      case 'ux':
        await this.upgradeUXComponents(upgrade);
        break;
      case 'infrastructure':
        await this.upgradeInfrastructure(upgrade);
        break;
      case 'database':
        await this.upgradeDatabaseComponents(upgrade);
        break;
      case 'api':
        await this.upgradeAPIComponents(upgrade);
        break;
      case 'monitoring':
        await this.upgradeMonitoringComponents(upgrade);
        break;
    }
  }

  private async upgradeAlgorithms(upgrade: UpgradeRequest): Promise<void> {
    logger.info('Upgrading ML/AI algorithms');
    // Deploy new model versions
    // Update feature extraction pipelines
    // Recalibrate scoring algorithms
    await this.simulateUpgrade(2000);
  }

  private async upgradeSecurityComponents(upgrade: UpgradeRequest): Promise<void> {
    logger.info('Upgrading security components');
    // Update authentication modules
    // Deploy new encryption standards
    // Refresh security policies
    await this.simulateUpgrade(3000);
  }

  private async upgradeUXComponents(upgrade: UpgradeRequest): Promise<void> {
    logger.info('Upgrading UX components');
    // Deploy new UI components
    // Update interaction patterns
    // Refresh design system
    await this.simulateUpgrade(1500);
  }

  private async upgradeInfrastructure(upgrade: UpgradeRequest): Promise<void> {
    logger.info('Upgrading infrastructure');
    // Scale compute resources
    // Update network configurations
    // Deploy new service mesh rules
    await this.simulateUpgrade(4000);
  }

  private async upgradeDatabaseComponents(upgrade: UpgradeRequest): Promise<void> {
    logger.info('Upgrading database components');
    // Run migrations
    // Optimize indexes
    // Update connection pools
    await this.simulateUpgrade(2500);
  }

  private async upgradeAPIComponents(upgrade: UpgradeRequest): Promise<void> {
    logger.info('Upgrading API components');
    // Deploy new API versions
    // Update GraphQL schema
    // Refresh rate limiting rules
    await this.simulateUpgrade(1800);
  }

  private async upgradeMonitoringComponents(upgrade: UpgradeRequest): Promise<void> {
    logger.info('Upgrading monitoring components');
    // Deploy new dashboards
    // Update alert rules
    // Refresh SLO definitions
    await this.simulateUpgrade(1200);
  }

  private async simulateUpgrade(durationMs: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, durationMs));
  }

  private async validateUpgrade(upgrade: UpgradeRequest): Promise<Record<string, boolean>> {
    logger.info(`Validating upgrade: ${upgrade.component}`);

    const results: Record<string, boolean> = {
      healthCheck: true,
      performanceBaseline: true,
      functionalTests: true,
      securityScan: true,
    };

    // Run component health check
    const health = await this.checkComponentHealth(upgrade.component);
    results.healthCheck = health.status !== 'unhealthy';

    // Performance validation
    results.performanceBaseline = await this.validatePerformance(upgrade.component);

    // Functional tests
    results.functionalTests = await this.runFunctionalTests(upgrade.component);

    // Security validation
    results.securityScan = await this.runSecurityScan(upgrade.component);

    return results;
  }

  private async rollbackUpgrade(upgrade: UpgradeRequest): Promise<void> {
    logger.warn(`Rolling back upgrade: ${upgrade.component}`);
    upgrade.status = 'rolled_back';
    // Execute rollback procedures
    await this.simulateUpgrade(1000);
    this.emit('upgrade_rolled_back', upgrade);
  }

  private async checkComponentHealth(component: UpgradeComponent): Promise<{ status: string }> {
    // Simulated health check
    return { status: 'healthy' };
  }

  private async validatePerformance(component: UpgradeComponent): Promise<boolean> {
    return true;
  }

  private async runFunctionalTests(component: UpgradeComponent): Promise<boolean> {
    return true;
  }

  private async runSecurityScan(component: UpgradeComponent): Promise<boolean> {
    return true;
  }

  private isWithinMaintenanceWindow(): boolean {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();

    return (
      this.policy.maintenanceWindow.dayOfWeek.includes(dayOfWeek) &&
      hour >= this.policy.maintenanceWindow.startHour &&
      hour < this.policy.maintenanceWindow.endHour
    );
  }

  private getNextMaintenanceWindow(): Date {
    const now = new Date();
    const nextWindow = new Date(now);

    // Find next valid day
    for (let i = 0; i < 7; i++) {
      nextWindow.setDate(nextWindow.getDate() + 1);
      if (this.policy.maintenanceWindow.dayOfWeek.includes(nextWindow.getDay())) {
        nextWindow.setHours(this.policy.maintenanceWindow.startHour, 0, 0, 0);
        return nextWindow;
      }
    }

    return nextWindow;
  }

  private mapTrendToComponent(category: string): UpgradeComponent | null {
    const mapping: Record<string, UpgradeComponent> = {
      technology: 'infrastructure',
      security: 'security',
      ux: 'ux',
      performance: 'algorithm',
      compliance: 'security',
    };
    return mapping[category] || null;
  }

  private mapThreatToComponent(threatType: string): UpgradeComponent | null {
    const mapping: Record<string, UpgradeComponent> = {
      feature_gap: 'ux',
      performance_lag: 'algorithm',
      security_weakness: 'security',
      ux_deficit: 'ux',
    };
    return mapping[threatType] || null;
  }

  private mapImpactToPriority(impact: string): 'low' | 'medium' | 'high' | 'critical' {
    const mapping: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      low: 'low',
      medium: 'medium',
      high: 'high',
      critical: 'critical',
    };
    return mapping[impact] || 'medium';
  }

  private normalizeComponent(name: string): UpgradeComponent | null {
    const mapping: Record<string, UpgradeComponent> = {
      'data-storage': 'database',
      'audit-logging': 'monitoring',
      'user-consent': 'ux',
      'authentication': 'security',
      'api-gateway': 'api',
    };
    return mapping[name] || null;
  }

  getUpgrade(id: string): UpgradeRequest | undefined {
    return this.upgradeQueue.get(id);
  }

  getAllUpgrades(): UpgradeRequest[] {
    return Array.from(this.upgradeQueue.values());
  }

  getPendingUpgrades(): UpgradeRequest[] {
    return this.getAllUpgrades().filter(u => u.status === 'pending');
  }

  getActiveUpgrades(): UpgradeRequest[] {
    return this.getAllUpgrades().filter(u =>
      u.status === 'analyzing' || u.status === 'in_progress' || u.status === 'validating'
    );
  }

  getComponentVersions(): ComponentVersion[] {
    return Array.from(this.componentVersions.values());
  }

  updatePolicy(policy: Partial<UpgradePolicy>): void {
    this.policy = { ...this.policy, ...policy };
    logger.info('Upgrade policy updated', { policy: this.policy });
  }
}
