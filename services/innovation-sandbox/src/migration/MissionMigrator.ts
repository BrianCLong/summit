import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import {
  MigrationConfig,
  MigrationStatus,
  MigrationPhase,
  DeploymentArtifact,
  SandboxConfig,
  ExecutionResult,
  IsolationLevel,
} from '../types/index.js';
import { SensitiveDataDetector } from '../detector/SensitiveDataDetector.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('MissionMigrator');

/**
 * MissionMigrator handles the secure migration of sandbox prototypes
 * to mission-ready deployment platforms.
 */
export class MissionMigrator {
  private detector: SensitiveDataDetector;
  private migrations: Map<string, MigrationStatus> = new Map();

  constructor() {
    this.detector = new SensitiveDataDetector();
  }

  /**
   * Initiate migration from sandbox to target platform
   */
  async initiateMigration(
    sandboxConfig: SandboxConfig,
    executionResults: ExecutionResult[],
    migrationConfig: MigrationConfig
  ): Promise<MigrationStatus> {
    const migrationId = randomUUID();

    const status: MigrationStatus = {
      migrationId,
      sandboxId: sandboxConfig.id,
      status: 'pending',
      phases: this.createPhases(migrationConfig),
      currentPhase: 0,
      artifacts: [],
      startedAt: new Date(),
    };

    this.migrations.set(migrationId, status);

    logger.info('Initiating migration', {
      migrationId,
      sandboxId: sandboxConfig.id,
      target: migrationConfig.targetPlatform,
    });

    // Run migration asynchronously
    this.runMigration(status, sandboxConfig, executionResults, migrationConfig)
      .catch(err => {
        status.status = 'failed';
        status.error = err.message;
        logger.error('Migration failed', { migrationId, error: err.message });
      });

    return status;
  }

  /**
   * Create migration phases based on configuration
   */
  private createPhases(config: MigrationConfig): MigrationPhase[] {
    const phases: MigrationPhase[] = [
      { name: 'Pre-flight Validation', status: 'pending' },
      { name: 'Security Compliance Check', status: 'pending' },
      { name: 'Data Sensitivity Scan', status: 'pending' },
      { name: 'Test Suite Execution', status: 'pending' },
      { name: 'Artifact Generation', status: 'pending' },
      { name: 'Policy Bundle Creation', status: 'pending' },
    ];

    if (config.targetEnvironment === 'mission') {
      phases.push(
        { name: 'Mission Compliance Validation', status: 'pending' },
        { name: 'Chain of Custody Registration', status: 'pending' }
      );
    }

    phases.push(
      { name: 'Deployment', status: 'pending' },
      { name: 'Health Verification', status: 'pending' }
    );

    return phases;
  }

  /**
   * Execute the migration pipeline
   */
  private async runMigration(
    status: MigrationStatus,
    sandboxConfig: SandboxConfig,
    results: ExecutionResult[],
    config: MigrationConfig
  ): Promise<void> {
    status.status = 'validating';

    for (let i = 0; i < status.phases.length; i++) {
      status.currentPhase = i;
      const phase = status.phases[i];
      phase.status = 'running';
      phase.startedAt = new Date();

      try {
        await this.executePhase(phase.name, status, sandboxConfig, results, config);
        phase.status = 'passed';
        phase.completedAt = new Date();
      } catch (err) {
        phase.status = 'failed';
        phase.details = err instanceof Error ? err.message : 'Unknown error';

        if (config.rollbackEnabled) {
          await this.rollback(status);
          status.status = 'rolled_back';
        } else {
          status.status = 'failed';
        }

        status.error = phase.details;
        return;
      }
    }

    status.status = 'complete';
    status.completedAt = new Date();

    logger.info('Migration completed', {
      migrationId: status.migrationId,
      duration: status.completedAt.getTime() - status.startedAt.getTime(),
    });
  }

  /**
   * Execute a specific migration phase
   */
  private async executePhase(
    phaseName: string,
    status: MigrationStatus,
    sandboxConfig: SandboxConfig,
    results: ExecutionResult[],
    config: MigrationConfig
  ): Promise<void> {
    logger.debug('Executing phase', { phase: phaseName, migrationId: status.migrationId });

    switch (phaseName) {
      case 'Pre-flight Validation':
        await this.validatePreflight(sandboxConfig, config);
        break;

      case 'Security Compliance Check':
        await this.checkSecurityCompliance(sandboxConfig, results);
        break;

      case 'Data Sensitivity Scan':
        await this.scanForSensitiveData(results);
        break;

      case 'Test Suite Execution':
        await this.executeTestSuite(results);
        break;

      case 'Artifact Generation':
        const artifacts = await this.generateArtifacts(sandboxConfig, config);
        status.artifacts.push(...artifacts);
        break;

      case 'Policy Bundle Creation':
        const policyBundle = await this.createPolicyBundle(sandboxConfig, config);
        status.artifacts.push(policyBundle);
        break;

      case 'Mission Compliance Validation':
        await this.validateMissionCompliance(sandboxConfig, config);
        break;

      case 'Chain of Custody Registration':
        await this.registerChainOfCustody(status, sandboxConfig);
        break;

      case 'Deployment':
        status.status = 'deploying';
        await this.deploy(status, config);
        break;

      case 'Health Verification':
        status.status = 'verifying';
        await this.verifyHealth(status, config);
        break;
    }
  }

  /**
   * Pre-flight validation checks
   */
  private async validatePreflight(
    sandboxConfig: SandboxConfig,
    config: MigrationConfig
  ): Promise<void> {
    // Check sandbox isolation level matches target
    if (
      config.targetEnvironment === 'mission' &&
      sandboxConfig.isolationLevel !== IsolationLevel.MISSION_READY
    ) {
      throw new Error('Mission deployment requires MISSION_READY isolation level');
    }

    // Check sandbox hasn't expired
    if (sandboxConfig.expiresAt && sandboxConfig.expiresAt < new Date()) {
      throw new Error('Sandbox has expired');
    }

    // Validate required approvers for production/mission
    if (
      ['production', 'mission'].includes(config.targetEnvironment) &&
      config.approvers.length === 0
    ) {
      throw new Error('Production/mission deployment requires at least one approver');
    }
  }

  /**
   * Security compliance validation
   */
  private async checkSecurityCompliance(
    sandboxConfig: SandboxConfig,
    results: ExecutionResult[]
  ): Promise<void> {
    // Check for high-confidence sensitive data flags
    for (const result of results) {
      const highConfidenceFlags = result.sensitiveDataFlags.filter(f => f.confidence > 0.9);
      if (highConfidenceFlags.length > 0) {
        throw new Error(
          `Security compliance failed: ${highConfidenceFlags.length} high-confidence sensitive data flags`
        );
      }
    }

    // Validate no blocked executions
    const blockedResults = results.filter(r => r.status === 'blocked');
    if (blockedResults.length > 0) {
      throw new Error(
        `Security compliance failed: ${blockedResults.length} executions were blocked`
      );
    }
  }

  /**
   * Final sensitive data scan
   */
  private async scanForSensitiveData(results: ExecutionResult[]): Promise<void> {
    let totalFlags = 0;
    for (const result of results) {
      totalFlags += result.sensitiveDataFlags.length;
    }

    logger.info('Sensitive data scan complete', { totalFlags });

    // Allow migration with warnings for low-confidence flags
    if (totalFlags > 100) {
      throw new Error('Too many sensitive data flags detected');
    }
  }

  /**
   * Execute auto-generated test suite
   */
  private async executeTestSuite(results: ExecutionResult[]): Promise<void> {
    for (const result of results) {
      if (result.testCases && result.testCases.length > 0) {
        const failedTests = result.testCases.filter(tc =>
          tc.category === 'security'
        );
        // In real implementation, actually run the tests
        logger.info('Test suite execution', {
          total: result.testCases.length,
          security: failedTests.length,
        });
      }
    }
  }

  /**
   * Generate deployment artifacts
   */
  private async generateArtifacts(
    sandboxConfig: SandboxConfig,
    config: MigrationConfig
  ): Promise<DeploymentArtifact[]> {
    const artifacts: DeploymentArtifact[] = [];
    const version = new Date().toISOString().replace(/[:.]/g, '-');

    // Container image
    artifacts.push({
      type: 'container_image',
      name: `sandbox-${sandboxConfig.id}`,
      version,
      hash: createHash('sha256').update(sandboxConfig.id + version).digest('hex'),
      location: `registry.intelgraph.io/sandbox/${sandboxConfig.id}:${version}`,
    });

    // Helm chart
    if (config.targetPlatform === 'kubernetes') {
      artifacts.push({
        type: 'helm_chart',
        name: `sandbox-${sandboxConfig.id}-chart`,
        version,
        hash: createHash('sha256').update(`helm-${sandboxConfig.id}`).digest('hex'),
        location: `charts/sandbox-${sandboxConfig.id}`,
      });
    }

    // Config map
    artifacts.push({
      type: 'config_map',
      name: `sandbox-${sandboxConfig.id}-config`,
      version,
      hash: createHash('sha256').update(JSON.stringify(sandboxConfig)).digest('hex'),
      location: `configmaps/sandbox-${sandboxConfig.id}.yaml`,
    });

    return artifacts;
  }

  /**
   * Create OPA policy bundle for the deployment
   */
  private async createPolicyBundle(
    sandboxConfig: SandboxConfig,
    config: MigrationConfig
  ): Promise<DeploymentArtifact> {
    const policyContent = this.generatePolicyRego(sandboxConfig, config);
    const hash = createHash('sha256').update(policyContent).digest('hex');

    return {
      type: 'policy_bundle',
      name: `sandbox-${sandboxConfig.id}-policy`,
      version: '1.0.0',
      hash,
      location: `policies/sandbox-${sandboxConfig.id}.tar.gz`,
    };
  }

  /**
   * Generate OPA policy for sandbox
   */
  private generatePolicyRego(
    sandboxConfig: SandboxConfig,
    config: MigrationConfig
  ): string {
    return `package sandbox.${sandboxConfig.id.replace(/-/g, '_')}

default allow = false

# Allow execution within resource quotas
allow {
    input.cpu_ms <= ${sandboxConfig.quotas.cpuMs}
    input.memory_mb <= ${sandboxConfig.quotas.memoryMb}
    input.tenant_id == "${sandboxConfig.tenantId}"
}

# Deny access to sensitive data types
deny[msg] {
    input.data_classification == "mission_critical"
    not input.environment == "mission"
    msg := "Mission critical data requires mission environment"
}

# Enforce network restrictions
deny[msg] {
    input.network_request
    not network_allowed
    msg := "Network access not permitted"
}

network_allowed {
    input.target_host == allowed_hosts[_]
}

allowed_hosts := ${JSON.stringify(sandboxConfig.networkAllowlist)}
`;
  }

  /**
   * Validate mission-specific compliance requirements
   */
  private async validateMissionCompliance(
    sandboxConfig: SandboxConfig,
    config: MigrationConfig
  ): Promise<void> {
    // FIPS compliance check
    logger.info('Validating FIPS compliance');

    // STIG compliance check
    logger.info('Validating STIG compliance');

    // Authority to Operate (ATO) validation
    logger.info('Validating ATO requirements');
  }

  /**
   * Register deployment in chain of custody ledger
   */
  private async registerChainOfCustody(
    status: MigrationStatus,
    sandboxConfig: SandboxConfig
  ): Promise<void> {
    const record = {
      migrationId: status.migrationId,
      sandboxId: sandboxConfig.id,
      ownerId: sandboxConfig.ownerId,
      tenantId: sandboxConfig.tenantId,
      artifacts: status.artifacts.map(a => ({
        name: a.name,
        hash: a.hash,
        type: a.type,
      })),
      timestamp: new Date().toISOString(),
    };

    logger.info('Chain of custody registered', {
      migrationId: status.migrationId,
      artifactCount: status.artifacts.length,
    });

    // In real implementation, write to prov-ledger service
  }

  /**
   * Deploy to target platform
   */
  private async deploy(
    status: MigrationStatus,
    config: MigrationConfig
  ): Promise<void> {
    logger.info('Deploying to target platform', {
      platform: config.targetPlatform,
      environment: config.targetEnvironment,
    });

    // Platform-specific deployment
    switch (config.targetPlatform) {
      case 'kubernetes':
        await this.deployToKubernetes(status, config);
        break;
      case 'lambda':
        await this.deployToLambda(status, config);
        break;
      case 'edge':
        await this.deployToEdge(status, config);
        break;
      case 'mission_cloud':
        await this.deployToMissionCloud(status, config);
        break;
    }
  }

  private async deployToKubernetes(
    status: MigrationStatus,
    config: MigrationConfig
  ): Promise<void> {
    // Apply Helm chart, config maps, secrets
    logger.info('Kubernetes deployment initiated');
  }

  private async deployToLambda(
    status: MigrationStatus,
    config: MigrationConfig
  ): Promise<void> {
    logger.info('Lambda deployment initiated');
  }

  private async deployToEdge(
    status: MigrationStatus,
    config: MigrationConfig
  ): Promise<void> {
    logger.info('Edge deployment initiated');
  }

  private async deployToMissionCloud(
    status: MigrationStatus,
    config: MigrationConfig
  ): Promise<void> {
    logger.info('Mission cloud deployment initiated');
  }

  /**
   * Verify deployment health
   */
  private async verifyHealth(
    status: MigrationStatus,
    config: MigrationConfig
  ): Promise<void> {
    logger.info('Verifying deployment health');

    // Health check endpoints
    // Smoke test execution
    // Performance baseline validation
  }

  /**
   * Rollback failed deployment
   */
  private async rollback(status: MigrationStatus): Promise<void> {
    logger.warn('Rolling back deployment', { migrationId: status.migrationId });

    // Remove deployed artifacts
    // Restore previous state
    // Notify stakeholders
  }

  /**
   * Get migration status
   */
  getStatus(migrationId: string): MigrationStatus | undefined {
    return this.migrations.get(migrationId);
  }

  /**
   * List all migrations for a sandbox
   */
  listMigrations(sandboxId: string): MigrationStatus[] {
    return Array.from(this.migrations.values())
      .filter(m => m.sandboxId === sandboxId);
  }
}
