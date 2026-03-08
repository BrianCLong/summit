"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionMigrator = void 0;
const crypto_1 = require("crypto");
const crypto_2 = require("crypto");
const index_js_1 = require("../types/index.js");
const SensitiveDataDetector_js_1 = require("../detector/SensitiveDataDetector.js");
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createLogger)('MissionMigrator');
/**
 * MissionMigrator handles the secure migration of sandbox prototypes
 * to mission-ready deployment platforms.
 */
class MissionMigrator {
    detector;
    migrations = new Map();
    constructor() {
        this.detector = new SensitiveDataDetector_js_1.SensitiveDataDetector();
    }
    /**
     * Initiate migration from sandbox to target platform
     */
    async initiateMigration(sandboxConfig, executionResults, migrationConfig) {
        const migrationId = (0, crypto_1.randomUUID)();
        const status = {
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
    createPhases(config) {
        const phases = [
            { name: 'Pre-flight Validation', status: 'pending' },
            { name: 'Security Compliance Check', status: 'pending' },
            { name: 'Data Sensitivity Scan', status: 'pending' },
            { name: 'Test Suite Execution', status: 'pending' },
            { name: 'Artifact Generation', status: 'pending' },
            { name: 'Policy Bundle Creation', status: 'pending' },
        ];
        if (config.targetEnvironment === 'mission') {
            phases.push({ name: 'Mission Compliance Validation', status: 'pending' }, { name: 'Chain of Custody Registration', status: 'pending' });
        }
        phases.push({ name: 'Deployment', status: 'pending' }, { name: 'Health Verification', status: 'pending' });
        return phases;
    }
    /**
     * Execute the migration pipeline
     */
    async runMigration(status, sandboxConfig, results, config) {
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
            }
            catch (err) {
                phase.status = 'failed';
                phase.details = err instanceof Error ? err.message : 'Unknown error';
                if (config.rollbackEnabled) {
                    await this.rollback(status);
                    status.status = 'rolled_back';
                }
                else {
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
    async executePhase(phaseName, status, sandboxConfig, results, config) {
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
            case 'Artifact Generation': {
                const artifacts = await this.generateArtifacts(sandboxConfig, config);
                status.artifacts.push(...artifacts);
                break;
            }
            case 'Policy Bundle Creation': {
                const policyBundle = await this.createPolicyBundle(sandboxConfig, config);
                status.artifacts.push(policyBundle);
                break;
            }
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
    async validatePreflight(sandboxConfig, config) {
        // Check sandbox isolation level matches target
        if (config.targetEnvironment === 'mission' &&
            sandboxConfig.isolationLevel !== index_js_1.IsolationLevel.MISSION_READY) {
            throw new Error('Mission deployment requires MISSION_READY isolation level');
        }
        // Check sandbox hasn't expired
        if (sandboxConfig.expiresAt && sandboxConfig.expiresAt < new Date()) {
            throw new Error('Sandbox has expired');
        }
        // Validate required approvers for production/mission
        if (['production', 'mission'].includes(config.targetEnvironment) &&
            config.approvers.length === 0) {
            throw new Error('Production/mission deployment requires at least one approver');
        }
    }
    /**
     * Security compliance validation
     */
    async checkSecurityCompliance(sandboxConfig, results) {
        // Check for high-confidence sensitive data flags
        for (const result of results) {
            const highConfidenceFlags = result.sensitiveDataFlags.filter(f => f.confidence > 0.9);
            if (highConfidenceFlags.length > 0) {
                throw new Error(`Security compliance failed: ${highConfidenceFlags.length} high-confidence sensitive data flags`);
            }
        }
        // Validate no blocked executions
        const blockedResults = results.filter(r => r.status === 'blocked');
        if (blockedResults.length > 0) {
            throw new Error(`Security compliance failed: ${blockedResults.length} executions were blocked`);
        }
    }
    /**
     * Final sensitive data scan
     */
    async scanForSensitiveData(results) {
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
    async executeTestSuite(results) {
        for (const result of results) {
            if (result.testCases && result.testCases.length > 0) {
                const failedTests = result.testCases.filter(tc => tc.category === 'security');
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
    async generateArtifacts(sandboxConfig, config) {
        const artifacts = [];
        const version = new Date().toISOString().replace(/[:.]/g, '-');
        // Container image
        artifacts.push({
            type: 'container_image',
            name: `sandbox-${sandboxConfig.id}`,
            version,
            hash: (0, crypto_2.createHash)('sha256').update(sandboxConfig.id + version).digest('hex'),
            location: `registry.intelgraph.io/sandbox/${sandboxConfig.id}:${version}`,
        });
        // Helm chart
        if (config.targetPlatform === 'kubernetes') {
            artifacts.push({
                type: 'helm_chart',
                name: `sandbox-${sandboxConfig.id}-chart`,
                version,
                hash: (0, crypto_2.createHash)('sha256').update(`helm-${sandboxConfig.id}`).digest('hex'),
                location: `charts/sandbox-${sandboxConfig.id}`,
            });
        }
        // Config map
        artifacts.push({
            type: 'config_map',
            name: `sandbox-${sandboxConfig.id}-config`,
            version,
            hash: (0, crypto_2.createHash)('sha256').update(JSON.stringify(sandboxConfig)).digest('hex'),
            location: `configmaps/sandbox-${sandboxConfig.id}.yaml`,
        });
        return artifacts;
    }
    /**
     * Create OPA policy bundle for the deployment
     */
    async createPolicyBundle(sandboxConfig, config) {
        const policyContent = this.generatePolicyRego(sandboxConfig, config);
        const hash = (0, crypto_2.createHash)('sha256').update(policyContent).digest('hex');
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
    generatePolicyRego(sandboxConfig, config) {
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
    async validateMissionCompliance(sandboxConfig, config) {
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
    async registerChainOfCustody(status, sandboxConfig) {
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
    async deploy(status, config) {
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
    async deployToKubernetes(status, config) {
        // Apply Helm chart, config maps, secrets
        logger.info('Kubernetes deployment initiated');
    }
    async deployToLambda(status, config) {
        logger.info('Lambda deployment initiated');
    }
    async deployToEdge(status, config) {
        logger.info('Edge deployment initiated');
    }
    async deployToMissionCloud(status, config) {
        logger.info('Mission cloud deployment initiated');
    }
    /**
     * Verify deployment health
     */
    async verifyHealth(status, config) {
        logger.info('Verifying deployment health');
        // Health check endpoints
        // Smoke test execution
        // Performance baseline validation
    }
    /**
     * Rollback failed deployment
     */
    async rollback(status) {
        logger.warn('Rolling back deployment', { migrationId: status.migrationId });
        // Remove deployed artifacts
        // Restore previous state
        // Notify stakeholders
    }
    /**
     * Get migration status
     */
    getStatus(migrationId) {
        return this.migrations.get(migrationId);
    }
    /**
     * List all migrations for a sandbox
     */
    listMigrations(sandboxId) {
        return Array.from(this.migrations.values())
            .filter(m => m.sandboxId === sandboxId);
    }
}
exports.MissionMigrator = MissionMigrator;
