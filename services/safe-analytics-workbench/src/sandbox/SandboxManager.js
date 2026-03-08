"use strict";
/**
 * Safe Analytics Workbench - Sandbox Manager
 *
 * Manages isolated execution environments for analytics workspaces.
 * Enforces resource limits, network isolation, and security policies.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SandboxManager = exports.SandboxStatus = void 0;
exports.generateNetworkPolicy = generateNetworkPolicy;
exports.generateResourceQuota = generateResourceQuota;
const events_1 = require("events");
const types_1 = require("../models/types");
const logger_1 = require("../utils/logger");
var SandboxStatus;
(function (SandboxStatus) {
    SandboxStatus["CREATING"] = "CREATING";
    SandboxStatus["STARTING"] = "STARTING";
    SandboxStatus["RUNNING"] = "RUNNING";
    SandboxStatus["STOPPING"] = "STOPPING";
    SandboxStatus["STOPPED"] = "STOPPED";
    SandboxStatus["FAILED"] = "FAILED";
    SandboxStatus["TERMINATED"] = "TERMINATED";
})(SandboxStatus || (exports.SandboxStatus = SandboxStatus = {}));
// ============================================================================
// Default Configurations
// ============================================================================
const DEFAULT_SECURITY_CONTEXT = {
    runAsNonRoot: true,
    runAsUser: 1000,
    runAsGroup: 1000,
    readOnlyRootFilesystem: true,
    allowPrivilegeEscalation: false,
    capabilities: {
        drop: ['ALL'],
        add: [],
    },
};
const DEFAULT_VOLUMES = [
    {
        name: 'workspace',
        mountPath: '/workspace',
        readOnly: false,
        type: 'EPHEMERAL',
    },
    {
        name: 'tmp',
        mountPath: '/tmp',
        readOnly: false,
        type: 'EPHEMERAL',
    },
];
const SANDBOX_IMAGES = {
    [types_1.WorkspaceType.AD_HOC]: 'analytics-sandbox:python-slim',
    [types_1.WorkspaceType.RECURRING_REPORT]: 'analytics-sandbox:python-reporting',
    [types_1.WorkspaceType.MODEL_DEVELOPMENT]: 'analytics-sandbox:python-ml',
    [types_1.WorkspaceType.AUDIT_INVESTIGATION]: 'analytics-sandbox:python-audit',
    [types_1.WorkspaceType.SHARED_ANALYSIS]: 'analytics-sandbox:python-collab',
};
// ============================================================================
// Sandbox Manager Implementation
// ============================================================================
class SandboxManager extends events_1.EventEmitter {
    orchestratorClient;
    policyEnforcer;
    sandboxes = new Map();
    workspaceSandboxMap = new Map();
    constructor(orchestratorClient, policyEnforcer) {
        super();
        this.orchestratorClient = orchestratorClient;
        this.policyEnforcer = policyEnforcer;
    }
    /**
     * Create and start a sandbox for a workspace
     */
    async createSandbox(workspace) {
        logger_1.logger.info('Creating sandbox', { workspaceId: workspace.id, type: workspace.type });
        // Check if sandbox already exists
        const existingSandboxId = this.workspaceSandboxMap.get(workspace.id);
        if (existingSandboxId) {
            const existing = this.sandboxes.get(existingSandboxId);
            if (existing && existing.status === SandboxStatus.RUNNING) {
                logger_1.logger.warn('Sandbox already exists and running', { sandboxId: existingSandboxId });
                return existing;
            }
        }
        // Build sandbox configuration
        const config = this.buildSandboxConfig(workspace);
        // Validate configuration against policies
        await this.policyEnforcer.validateSandboxConfig(config, workspace);
        // Create sandbox instance
        const sandbox = {
            id: this.generateSandboxId(workspace.id),
            workspaceId: workspace.id,
            status: SandboxStatus.CREATING,
            config,
            createdAt: new Date(),
            metrics: this.initializeMetrics(),
        };
        this.sandboxes.set(sandbox.id, sandbox);
        this.workspaceSandboxMap.set(workspace.id, sandbox.id);
        // Emit creation event
        this.emitEvent({
            type: 'CREATED',
            sandboxId: sandbox.id,
            workspaceId: workspace.id,
            timestamp: new Date(),
            details: { config },
        });
        try {
            // Deploy sandbox via orchestrator
            sandbox.status = SandboxStatus.STARTING;
            const endpoint = await this.orchestratorClient.deploySandbox(sandbox);
            sandbox.endpoint = endpoint;
            sandbox.startedAt = new Date();
            sandbox.status = SandboxStatus.RUNNING;
            this.emitEvent({
                type: 'STARTED',
                sandboxId: sandbox.id,
                workspaceId: workspace.id,
                timestamp: new Date(),
                details: { endpoint },
            });
            logger_1.logger.info('Sandbox started successfully', { sandboxId: sandbox.id, endpoint });
            return sandbox;
        }
        catch (error) {
            sandbox.status = SandboxStatus.FAILED;
            this.emitEvent({
                type: 'FAILED',
                sandboxId: sandbox.id,
                workspaceId: workspace.id,
                timestamp: new Date(),
                details: { error: error.message },
            });
            throw error;
        }
    }
    /**
     * Stop and cleanup a sandbox
     */
    async stopSandbox(workspaceId, reason) {
        const sandboxId = this.workspaceSandboxMap.get(workspaceId);
        if (!sandboxId) {
            logger_1.logger.warn('No sandbox found for workspace', { workspaceId });
            return;
        }
        const sandbox = this.sandboxes.get(sandboxId);
        if (!sandbox) {
            logger_1.logger.warn('Sandbox not found', { sandboxId });
            return;
        }
        logger_1.logger.info('Stopping sandbox', { sandboxId, workspaceId, reason });
        sandbox.status = SandboxStatus.STOPPING;
        try {
            await this.orchestratorClient.terminateSandbox(sandboxId);
            sandbox.status = SandboxStatus.STOPPED;
            sandbox.stoppedAt = new Date();
            this.emitEvent({
                type: 'STOPPED',
                sandboxId,
                workspaceId,
                timestamp: new Date(),
                details: { reason },
            });
        }
        catch (error) {
            sandbox.status = SandboxStatus.FAILED;
            throw error;
        }
    }
    /**
     * Get sandbox for a workspace
     */
    getSandbox(workspaceId) {
        const sandboxId = this.workspaceSandboxMap.get(workspaceId);
        return sandboxId ? this.sandboxes.get(sandboxId) : undefined;
    }
    /**
     * Update sandbox metrics
     */
    async refreshMetrics(workspaceId) {
        const sandbox = this.getSandbox(workspaceId);
        if (!sandbox || sandbox.status !== SandboxStatus.RUNNING) {
            return null;
        }
        const metrics = await this.orchestratorClient.getMetrics(sandbox.id);
        sandbox.metrics = metrics;
        sandbox.lastActivityAt = new Date();
        // Check for resource alerts
        this.checkResourceAlerts(sandbox);
        return metrics;
    }
    /**
     * Check if sandbox is within resource limits
     */
    checkResourceAlerts(sandbox) {
        const { metrics, config } = sandbox;
        const { resources } = config;
        // Check memory usage
        const memoryPercent = (metrics.memoryUsageBytes / metrics.memoryLimitBytes) * 100;
        if (memoryPercent > 90) {
            this.emitEvent({
                type: 'RESOURCE_ALERT',
                sandboxId: sandbox.id,
                workspaceId: sandbox.workspaceId,
                timestamp: new Date(),
                details: {
                    resource: 'memory',
                    usagePercent: memoryPercent,
                    threshold: 90,
                },
            });
        }
        // Check storage usage
        const storagePercent = (metrics.storageUsageBytes / metrics.storageLimitBytes) * 100;
        if (storagePercent > 80) {
            this.emitEvent({
                type: 'RESOURCE_ALERT',
                sandboxId: sandbox.id,
                workspaceId: sandbox.workspaceId,
                timestamp: new Date(),
                details: {
                    resource: 'storage',
                    usagePercent: storagePercent,
                    threshold: 80,
                },
            });
        }
        // Check CPU usage
        if (metrics.cpuUsagePercent > 95) {
            this.emitEvent({
                type: 'RESOURCE_ALERT',
                sandboxId: sandbox.id,
                workspaceId: sandbox.workspaceId,
                timestamp: new Date(),
                details: {
                    resource: 'cpu',
                    usagePercent: metrics.cpuUsagePercent,
                    threshold: 95,
                },
            });
        }
    }
    /**
     * Build sandbox configuration for a workspace
     */
    buildSandboxConfig(workspace) {
        const resources = workspace.config.resources;
        const image = SANDBOX_IMAGES[workspace.type];
        return {
            image,
            resources,
            networkPolicy: 'analytics-sandbox-isolation',
            env: {
                WORKSPACE_ID: workspace.id,
                WORKSPACE_TYPE: workspace.type,
                TENANT_ID: workspace.tenantId,
                QUERY_TIMEOUT_SECONDS: String(resources.queryTimeoutSeconds),
                MAX_CONCURRENT_QUERIES: String(resources.maxConcurrentQueries),
            },
            volumes: DEFAULT_VOLUMES,
            securityContext: DEFAULT_SECURITY_CONTEXT,
        };
    }
    /**
     * Generate unique sandbox ID
     */
    generateSandboxId(workspaceId) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `sandbox-${workspaceId.substring(0, 8)}-${timestamp}-${random}`;
    }
    /**
     * Initialize empty metrics
     */
    initializeMetrics() {
        return {
            cpuUsagePercent: 0,
            memoryUsageBytes: 0,
            memoryLimitBytes: 0,
            storageUsageBytes: 0,
            storageLimitBytes: 0,
            networkInBytes: 0,
            networkOutBytes: 0,
            activeConnections: 0,
            queriesExecuted: 0,
        };
    }
    /**
     * Emit sandbox event
     */
    emitEvent(event) {
        this.emit('sandbox-event', event);
        logger_1.logger.debug('Sandbox event', event);
    }
}
exports.SandboxManager = SandboxManager;
// ============================================================================
// Network Policy Generator
// ============================================================================
function generateNetworkPolicy(workspaceId, tenantId) {
    return {
        apiVersion: 'networking.k8s.io/v1',
        kind: 'NetworkPolicy',
        metadata: {
            name: `sandbox-${workspaceId}`,
            namespace: `tenant-${tenantId}`,
            labels: {
                'app.kubernetes.io/name': 'analytics-sandbox',
                'app.kubernetes.io/component': 'network-policy',
                'workbench.intelgraph.io/workspace-id': workspaceId,
            },
        },
        spec: {
            podSelector: {
                matchLabels: {
                    'workbench.intelgraph.io/workspace-id': workspaceId,
                },
            },
            policyTypes: ['Ingress', 'Egress'],
            ingress: [
                {
                    // Allow from workbench API only
                    from: [
                        {
                            podSelector: {
                                matchLabels: {
                                    app: 'safe-analytics-workbench',
                                },
                            },
                        },
                    ],
                    ports: [
                        {
                            protocol: 'TCP',
                            port: 8080,
                        },
                    ],
                },
            ],
            egress: [
                // Allow DNS
                {
                    to: [{ namespaceSelector: {} }],
                    ports: [{ protocol: 'UDP', port: 53 }],
                },
                // Allow data layer (PostgreSQL)
                {
                    to: [
                        {
                            podSelector: {
                                matchLabels: { layer: 'data', service: 'postgresql' },
                            },
                        },
                    ],
                    ports: [{ protocol: 'TCP', port: 5432 }],
                },
                // Allow data layer (Neo4j)
                {
                    to: [
                        {
                            podSelector: {
                                matchLabels: { layer: 'data', service: 'neo4j' },
                            },
                        },
                    ],
                    ports: [
                        { protocol: 'TCP', port: 7687 },
                        { protocol: 'TCP', port: 7474 },
                    ],
                },
                // Allow Redis for caching
                {
                    to: [
                        {
                            podSelector: {
                                matchLabels: { layer: 'cache', service: 'redis' },
                            },
                        },
                    ],
                    ports: [{ protocol: 'TCP', port: 6379 }],
                },
                // Block all other egress (implicit)
            ],
        },
    };
}
// ============================================================================
// Resource Quota Generator
// ============================================================================
function generateResourceQuota(workspaceId, tenantId, resources) {
    return {
        apiVersion: 'v1',
        kind: 'ResourceQuota',
        metadata: {
            name: `sandbox-quota-${workspaceId}`,
            namespace: `tenant-${tenantId}`,
            labels: {
                'workbench.intelgraph.io/workspace-id': workspaceId,
            },
        },
        spec: {
            hard: {
                'requests.cpu': `${resources.vcpu}`,
                'requests.memory': `${resources.memoryGb}Gi`,
                'limits.cpu': `${resources.vcpu * 2}`,
                'limits.memory': `${resources.memoryGb * 1.5}Gi`,
                'requests.storage': `${resources.storageGb}Gi`,
                pods: '1',
                persistentvolumeclaims: '1',
            },
        },
    };
}
