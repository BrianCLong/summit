"use strict";
// @ts-nocheck
/**
 * Auto-Remediation Hooks
 * Implements automated response actions for threat hunting findings
 * with CTI/OSINT integration and safety controls
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoRemediationHooks = exports.AutoRemediationHooks = void 0;
const events_1 = require("events");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const DEFAULT_CTI_SOURCES = [
    { name: 'MISP', type: 'misp', baseUrl: 'https://misp.local', enabled: true },
    { name: 'AlienVault OTX', type: 'otx', baseUrl: 'https://otx.alienvault.com/api/v1', enabled: true },
    { name: 'VirusTotal', type: 'virustotal', baseUrl: 'https://www.virustotal.com/api/v3', enabled: true },
    { name: 'Shodan', type: 'shodan', baseUrl: 'https://api.shodan.io', enabled: true },
    { name: 'Censys', type: 'censys', baseUrl: 'https://search.censys.io/api', enabled: true },
];
const DEFAULT_OSINT_SOURCES = [
    { name: 'Pastebin', type: 'pastebin', enabled: true },
    { name: 'GitHub', type: 'github', enabled: true },
    { name: 'Twitter/X', type: 'twitter', enabled: true },
    { name: 'Reddit', type: 'reddit', enabled: true },
];
class AutoRemediationHooks extends events_1.EventEmitter {
    ctiSources = new Map();
    osintSources = new Map();
    hooks = new Map();
    executors = new Map();
    activePlans = new Map();
    approvalQueue = new Map();
    constructor() {
        super();
        this.setMaxListeners(100);
        this.initializeSources();
        this.registerDefaultHooks();
        this.registerDefaultExecutors();
    }
    /**
     * Initialize CTI and OSINT sources
     */
    initializeSources() {
        for (const source of DEFAULT_CTI_SOURCES) {
            this.ctiSources.set(source.name, source);
        }
        for (const source of DEFAULT_OSINT_SOURCES) {
            this.osintSources.set(source.name, source);
        }
    }
    /**
     * Register default pre/post remediation hooks
     */
    registerDefaultHooks() {
        // Pre-remediation: Validate scope
        this.registerHook({
            name: 'validate_scope',
            type: 'pre',
            actionTypes: ['ISOLATE_HOST', 'DISABLE_ACCOUNT', 'REVOKE_CREDENTIALS'],
            handler: async (action, context) => {
                const target = action.target;
                // Don't remediate critical infrastructure without explicit approval
                if (target.criticality === 'CRITICAL') {
                    return {
                        proceed: false,
                        message: `Action blocked: Target ${target.name} is critical infrastructure. Manual approval required.`,
                    };
                }
                return { proceed: true };
            },
        });
        // Pre-remediation: Check confidence threshold
        this.registerHook({
            name: 'confidence_check',
            type: 'pre',
            actionTypes: [
                'BLOCK_IP',
                'BLOCK_DOMAIN',
                'QUARANTINE_FILE',
                'DISABLE_ACCOUNT',
                'ISOLATE_HOST',
            ],
            handler: async (action, context) => {
                if (context.finding.confidence < 0.8) {
                    return {
                        proceed: false,
                        message: `Action blocked: Finding confidence (${context.finding.confidence}) below threshold (0.8)`,
                    };
                }
                return { proceed: true };
            },
        });
        // Pre-remediation: Rate limiting
        this.registerHook({
            name: 'rate_limit',
            type: 'pre',
            actionTypes: [
                'BLOCK_IP',
                'BLOCK_DOMAIN',
                'DISABLE_ACCOUNT',
                'ISOLATE_HOST',
                'KILL_PROCESS',
            ],
            handler: async (action, context) => {
                const recentActions = context.previousResults.filter((r) => Date.now() - r.timestamp.getTime() < 60000 // Last minute
                );
                if (recentActions.length >= 10) {
                    return {
                        proceed: false,
                        message: 'Rate limit exceeded: Too many remediation actions in short time',
                    };
                }
                return { proceed: true };
            },
        });
        // Post-remediation: Verify and log
        this.registerHook({
            name: 'verify_and_log',
            type: 'post',
            actionTypes: [
                'BLOCK_IP',
                'BLOCK_DOMAIN',
                'QUARANTINE_FILE',
                'DISABLE_ACCOUNT',
                'ISOLATE_HOST',
            ],
            handler: async (action, context) => {
                // Log the action for audit
                logger_js_1.default.info('Remediation action completed', {
                    huntId: context.huntId,
                    actionId: action.id,
                    actionType: action.actionType,
                    target: action.target.id,
                    findingId: action.findingId,
                });
                this.emit('remediation_completed', {
                    huntId: context.huntId,
                    action,
                    context,
                });
                return { proceed: true };
            },
        });
        // Post-remediation: Update threat intelligence
        this.registerHook({
            name: 'update_threat_intel',
            type: 'post',
            actionTypes: ['BLOCK_IP', 'BLOCK_DOMAIN', 'QUARANTINE_FILE'],
            handler: async (action, context) => {
                // Update internal threat intelligence with confirmed IOCs
                const iocs = context.finding.iocsIdentified;
                for (const ioc of iocs) {
                    this.emit('ioc_confirmed', {
                        ioc,
                        action: action.actionType,
                        huntId: context.huntId,
                        confidence: context.finding.confidence,
                    });
                }
                return { proceed: true };
            },
        });
    }
    /**
     * Register default action executors
     */
    registerDefaultExecutors() {
        // Block IP executor
        this.registerExecutor({
            actionType: 'BLOCK_IP',
            execute: async (action, target) => {
                const startTime = Date.now();
                try {
                    // Simulate firewall API call
                    logger_js_1.default.info('Blocking IP address', {
                        ip: target.id,
                        actionId: action.id,
                    });
                    // In production, this would call the firewall API
                    await this.simulateAction(500);
                    return {
                        success: true,
                        message: `IP ${target.id} blocked successfully`,
                        timestamp: new Date(),
                        affectedEntities: [target.id],
                        metrics: {
                            entitiesProcessed: 1,
                            entitiesSuccessful: 1,
                            entitiesFailed: 0,
                            executionTimeMs: Date.now() - startTime,
                        },
                        rollbackAvailable: true,
                    };
                }
                catch (error) {
                    return {
                        success: false,
                        message: `Failed to block IP: ${error.message}`,
                        timestamp: new Date(),
                        affectedEntities: [],
                        metrics: {
                            entitiesProcessed: 1,
                            entitiesSuccessful: 0,
                            entitiesFailed: 1,
                            executionTimeMs: Date.now() - startTime,
                        },
                        errors: [error.message],
                        rollbackAvailable: false,
                    };
                }
            },
            rollback: async (action, target) => {
                logger_js_1.default.info('Rolling back IP block', { ip: target.id });
                await this.simulateAction(500);
                return {
                    success: true,
                    message: `IP ${target.id} unblocked`,
                    timestamp: new Date(),
                    affectedEntities: [target.id],
                    metrics: {
                        entitiesProcessed: 1,
                        entitiesSuccessful: 1,
                        entitiesFailed: 0,
                        executionTimeMs: 500,
                    },
                    rollbackAvailable: false,
                };
            },
        });
        // Block domain executor
        this.registerExecutor({
            actionType: 'BLOCK_DOMAIN',
            execute: async (action, target) => {
                const startTime = Date.now();
                logger_js_1.default.info('Blocking domain', { domain: target.id });
                await this.simulateAction(500);
                return {
                    success: true,
                    message: `Domain ${target.id} blocked in DNS sinkhole`,
                    timestamp: new Date(),
                    affectedEntities: [target.id],
                    metrics: {
                        entitiesProcessed: 1,
                        entitiesSuccessful: 1,
                        entitiesFailed: 0,
                        executionTimeMs: Date.now() - startTime,
                    },
                    rollbackAvailable: true,
                };
            },
        });
        // Quarantine file executor
        this.registerExecutor({
            actionType: 'QUARANTINE_FILE',
            execute: async (action, target) => {
                const startTime = Date.now();
                logger_js_1.default.info('Quarantining file', { hash: target.id });
                await this.simulateAction(1000);
                return {
                    success: true,
                    message: `File ${target.id} quarantined across endpoints`,
                    timestamp: new Date(),
                    affectedEntities: [target.id],
                    metrics: {
                        entitiesProcessed: 1,
                        entitiesSuccessful: 1,
                        entitiesFailed: 0,
                        executionTimeMs: Date.now() - startTime,
                    },
                    rollbackAvailable: true,
                };
            },
        });
        // Disable account executor
        this.registerExecutor({
            actionType: 'DISABLE_ACCOUNT',
            execute: async (action, target) => {
                const startTime = Date.now();
                logger_js_1.default.info('Disabling account', { accountId: target.id });
                await this.simulateAction(800);
                return {
                    success: true,
                    message: `Account ${target.name} disabled`,
                    timestamp: new Date(),
                    affectedEntities: [target.id],
                    metrics: {
                        entitiesProcessed: 1,
                        entitiesSuccessful: 1,
                        entitiesFailed: 0,
                        executionTimeMs: Date.now() - startTime,
                    },
                    rollbackAvailable: true,
                };
            },
        });
        // Isolate host executor
        this.registerExecutor({
            actionType: 'ISOLATE_HOST',
            execute: async (action, target) => {
                const startTime = Date.now();
                logger_js_1.default.info('Isolating host', { hostId: target.id });
                await this.simulateAction(2000);
                return {
                    success: true,
                    message: `Host ${target.name} isolated from network`,
                    timestamp: new Date(),
                    affectedEntities: [target.id],
                    metrics: {
                        entitiesProcessed: 1,
                        entitiesSuccessful: 1,
                        entitiesFailed: 0,
                        executionTimeMs: Date.now() - startTime,
                    },
                    rollbackAvailable: true,
                };
            },
        });
        // Kill process executor
        this.registerExecutor({
            actionType: 'KILL_PROCESS',
            execute: async (action, target) => {
                const startTime = Date.now();
                logger_js_1.default.info('Killing process', { processId: target.id });
                await this.simulateAction(300);
                return {
                    success: true,
                    message: `Process ${target.name} terminated`,
                    timestamp: new Date(),
                    affectedEntities: [target.id],
                    metrics: {
                        entitiesProcessed: 1,
                        entitiesSuccessful: 1,
                        entitiesFailed: 0,
                        executionTimeMs: Date.now() - startTime,
                    },
                    rollbackAvailable: false,
                };
            },
        });
        // Alert team executor
        this.registerExecutor({
            actionType: 'ALERT_TEAM',
            execute: async (action, target) => {
                const startTime = Date.now();
                logger_js_1.default.info('Sending alert', { target: target.id });
                // In production, send to Slack, PagerDuty, etc.
                this.emit('alert_sent', {
                    actionId: action.id,
                    target,
                    finding: action.findingId,
                });
                return {
                    success: true,
                    message: 'Security team alerted',
                    timestamp: new Date(),
                    affectedEntities: [],
                    metrics: {
                        entitiesProcessed: 1,
                        entitiesSuccessful: 1,
                        entitiesFailed: 0,
                        executionTimeMs: Date.now() - startTime,
                    },
                    rollbackAvailable: false,
                };
            },
        });
        // Create ticket executor
        this.registerExecutor({
            actionType: 'CREATE_TICKET',
            execute: async (action, target) => {
                const startTime = Date.now();
                const ticketId = `TKT-${Date.now()}`;
                logger_js_1.default.info('Creating ticket', { ticketId, target: target.id });
                return {
                    success: true,
                    message: `Ticket ${ticketId} created`,
                    timestamp: new Date(),
                    affectedEntities: [ticketId],
                    metrics: {
                        entitiesProcessed: 1,
                        entitiesSuccessful: 1,
                        entitiesFailed: 0,
                        executionTimeMs: Date.now() - startTime,
                    },
                    rollbackAvailable: false,
                };
            },
        });
    }
    /**
     * Simulate async action for demo purposes
     */
    async simulateAction(delayMs) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    /**
     * Register a CTI source
     */
    registerCTISource(source) {
        this.ctiSources.set(source.name, source);
        logger_js_1.default.info('CTI source registered', { name: source.name, type: source.type });
    }
    /**
     * Register an OSINT source
     */
    registerOSINTSource(source) {
        this.osintSources.set(source.name, source);
        logger_js_1.default.info('OSINT source registered', { name: source.name, type: source.type });
    }
    /**
     * Register a remediation hook
     */
    registerHook(hook) {
        this.hooks.set(hook.name, hook);
        logger_js_1.default.debug('Remediation hook registered', { name: hook.name, type: hook.type });
    }
    /**
     * Register a remediation executor
     */
    registerExecutor(executor) {
        this.executors.set(executor.actionType, executor);
        logger_js_1.default.debug('Remediation executor registered', { type: executor.actionType });
    }
    /**
     * Enrich findings with CTI and OSINT data
     */
    async enrichFindings(findings) {
        const enrichedFindings = [];
        for (const finding of findings) {
            const ctiCorrelations = await this.fetchCTICorrelations(finding.iocsIdentified);
            const osintData = await this.fetchOSINTData(finding.iocsIdentified);
            const threatActorAttribution = await this.attributeThreatActors(ctiCorrelations, finding);
            const campaignAssociations = await this.findCampaignAssociations(ctiCorrelations, finding);
            enrichedFindings.push({
                ...finding,
                ctiCorrelations,
                osintData,
                threatActorAttribution,
                campaignAssociations,
                enrichmentTimestamp: new Date(),
            });
        }
        this.emit('findings_enriched', {
            count: enrichedFindings.length,
            ctiMatchesFound: enrichedFindings.reduce((sum, f) => sum + f.ctiCorrelations.length, 0),
        });
        return enrichedFindings;
    }
    /**
     * Fetch CTI correlations for IOCs
     */
    async fetchCTICorrelations(iocs) {
        const correlations = [];
        for (const [name, source] of this.ctiSources) {
            if (!source.enabled)
                continue;
            for (const ioc of iocs) {
                try {
                    const correlation = await this.queryCTISource(source, ioc);
                    if (correlation) {
                        correlations.push(correlation);
                    }
                }
                catch (error) {
                    logger_js_1.default.warn('CTI query failed', {
                        source: name,
                        ioc: ioc.value,
                        error: error.message,
                    });
                }
            }
        }
        return correlations;
    }
    /**
     * Query a CTI source for an IOC
     */
    async queryCTISource(source, ioc) {
        // Simulate CTI lookup - in production, make actual API calls
        await this.simulateAction(100);
        // Simulate finding a match with some probability
        if (Math.random() > 0.7) {
            return {
                source: source.name,
                feedName: `${source.name} Threat Feed`,
                matchedIOC: ioc.value,
                confidence: 0.7 + Math.random() * 0.3,
                severity: this.randomSeverity(),
                context: `IOC ${ioc.value} found in ${source.name} threat intelligence`,
                lastUpdated: new Date(),
            };
        }
        return null;
    }
    /**
     * Fetch OSINT data for IOCs
     */
    async fetchOSINTData(iocs) {
        const osintData = [];
        for (const [name, source] of this.osintSources) {
            if (!source.enabled)
                continue;
            for (const ioc of iocs) {
                try {
                    const data = await this.queryOSINTSource(source, ioc);
                    if (data) {
                        osintData.push(data);
                    }
                }
                catch (error) {
                    logger_js_1.default.warn('OSINT query failed', {
                        source: name,
                        ioc: ioc.value,
                        error: error.message,
                    });
                }
            }
        }
        return osintData;
    }
    /**
     * Query an OSINT source
     */
    async queryOSINTSource(source, ioc) {
        // Simulate OSINT lookup
        await this.simulateAction(150);
        if (Math.random() > 0.8) {
            return {
                source: source.name,
                type: source.type,
                content: `Reference to ${ioc.value} found on ${source.name}`,
                relevanceScore: 0.5 + Math.random() * 0.5,
                discoveredAt: new Date(),
            };
        }
        return null;
    }
    /**
     * Attribute threat actors based on CTI correlations
     */
    async attributeThreatActors(correlations, finding) {
        // Simulate threat actor attribution
        const ttps = finding.ttpsMatched.map((t) => t.id);
        // In production, query threat actor database
        if (correlations.length > 2 && ttps.length > 1) {
            return [
                {
                    actorId: `TA-${Date.now()}`,
                    actorName: 'APT-SIMULATED',
                    aliases: ['SimActor', 'DemoThreat'],
                    attributionConfidence: 0.6,
                    country: 'Unknown',
                    motivation: ['espionage', 'financial'],
                    capabilities: ['phishing', 'malware', 'lateral-movement'],
                    associatedCampaigns: [],
                },
            ];
        }
        return [];
    }
    /**
     * Find campaign associations
     */
    async findCampaignAssociations(correlations, finding) {
        // Simulate campaign association
        if (correlations.length > 3) {
            return [
                {
                    campaignId: `CAMP-${Date.now()}`,
                    campaignName: 'Operation Demo',
                    active: true,
                    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    targetSectors: ['technology', 'finance'],
                    targetRegions: ['north-america'],
                    associationConfidence: 0.5,
                },
            ];
        }
        return [];
    }
    /**
     * Create a remediation plan from enriched findings
     */
    async createRemediationPlan(huntId, findings, approvalRequired = true) {
        const eligibleFindings = findings.filter((f) => f.autoRemediationEligible);
        const actions = [];
        let executionOrder = 0;
        for (const finding of eligibleFindings) {
            for (const recommendedAction of finding.recommendedActions) {
                if (recommendedAction.automated) {
                    const target = this.deriveTargetFromFinding(finding, recommendedAction);
                    actions.push({
                        id: `action-${Date.now()}-${executionOrder}`,
                        findingId: finding.id,
                        actionType: recommendedAction.type,
                        target,
                        parameters: {},
                        status: 'pending',
                        executionOrder: executionOrder++,
                        dependsOn: [],
                    });
                }
            }
        }
        const plan = {
            id: `plan-${Date.now()}`,
            huntId,
            findings: eligibleFindings.map((f) => f.id),
            actions,
            status: approvalRequired ? 'pending_approval' : 'approved',
            approvalRequired,
            createdAt: new Date(),
        };
        this.activePlans.set(plan.id, plan);
        if (approvalRequired) {
            this.approvalQueue.set(plan.id, plan);
            this.emit('approval_required', { plan });
        }
        logger_js_1.default.info('Remediation plan created', {
            planId: plan.id,
            huntId,
            actionsCount: actions.length,
            approvalRequired,
        });
        return plan;
    }
    /**
     * Derive remediation target from finding
     */
    deriveTargetFromFinding(finding, action) {
        const primaryEntity = finding.entitiesInvolved[0];
        const primaryIOC = finding.iocsIdentified[0];
        return {
            type: primaryEntity?.type || primaryIOC?.type || 'unknown',
            id: primaryEntity?.id || primaryIOC?.id || 'unknown',
            name: primaryEntity?.name || primaryIOC?.value || 'unknown',
            environment: 'production',
            criticality: finding.severity === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
        };
    }
    /**
     * Approve a remediation plan
     */
    async approvePlan(planId, approver) {
        const plan = this.approvalQueue.get(planId);
        if (!plan) {
            throw new Error(`Plan ${planId} not found in approval queue`);
        }
        plan.status = 'approved';
        plan.approvedBy = approver;
        plan.approvedAt = new Date();
        this.approvalQueue.delete(planId);
        this.activePlans.set(planId, plan);
        this.emit('plan_approved', { planId, approver });
        logger_js_1.default.info('Remediation plan approved', { planId, approver });
    }
    /**
     * Execute a remediation plan
     */
    async executePlan(planId) {
        const plan = this.activePlans.get(planId);
        if (!plan) {
            throw new Error(`Plan ${planId} not found`);
        }
        if (plan.status !== 'approved') {
            throw new Error(`Plan ${planId} is not approved (status: ${plan.status})`);
        }
        plan.status = 'executing';
        plan.executedAt = new Date();
        const results = [];
        const context = {
            huntId: plan.huntId,
            finding: null, // Will be set per action
            plan,
            previousResults: results,
        };
        // Sort actions by execution order and dependencies
        const sortedActions = this.topologicalSortActions(plan.actions);
        for (const action of sortedActions) {
            try {
                // Run pre-hooks
                const preHookResult = await this.runHooks('pre', action, context);
                if (!preHookResult.proceed) {
                    action.status = 'skipped';
                    logger_js_1.default.info('Action skipped by pre-hook', {
                        actionId: action.id,
                        reason: preHookResult.message,
                    });
                    continue;
                }
                // Execute action
                action.status = 'executing';
                const executor = this.executors.get(action.actionType);
                if (!executor) {
                    throw new Error(`No executor for action type: ${action.actionType}`);
                }
                const result = await executor.execute(action, action.target);
                action.result = result;
                action.status = result.success ? 'completed' : 'failed';
                results.push(result);
                // Run post-hooks
                await this.runHooks('post', action, context);
            }
            catch (error) {
                action.status = 'failed';
                const errorResult = {
                    success: false,
                    message: error.message,
                    timestamp: new Date(),
                    affectedEntities: [],
                    metrics: {
                        entitiesProcessed: 0,
                        entitiesSuccessful: 0,
                        entitiesFailed: 1,
                        executionTimeMs: 0,
                    },
                    errors: [error.message],
                    rollbackAvailable: false,
                };
                action.result = errorResult;
                results.push(errorResult);
                logger_js_1.default.error('Action execution failed', {
                    actionId: action.id,
                    error: error.message,
                });
            }
        }
        // Update plan status
        const allSuccessful = results.every((r) => r.success);
        const anySuccessful = results.some((r) => r.success);
        plan.status = allSuccessful
            ? 'completed'
            : anySuccessful
                ? 'partial_success'
                : 'failed';
        plan.completedAt = new Date();
        this.emit('plan_executed', {
            planId,
            status: plan.status,
            results,
        });
        return results;
    }
    /**
     * Run hooks for an action
     */
    async runHooks(type, action, context) {
        for (const [, hook] of this.hooks) {
            if (hook.type !== type)
                continue;
            if (!hook.actionTypes.includes(action.actionType))
                continue;
            const result = await hook.handler(action, context);
            if (!result.proceed && type === 'pre') {
                return result;
            }
        }
        return { proceed: true };
    }
    /**
     * Topologically sort actions based on dependencies
     */
    topologicalSortActions(actions) {
        const actionMap = new Map(actions.map((a) => [a.id, a]));
        const visited = new Set();
        const result = [];
        const visit = (actionId) => {
            if (visited.has(actionId))
                return;
            visited.add(actionId);
            const action = actionMap.get(actionId);
            if (!action)
                return;
            for (const depId of action.dependsOn) {
                visit(depId);
            }
            result.push(action);
        };
        // Sort by execution order first
        const sortedByOrder = [...actions].sort((a, b) => a.executionOrder - b.executionOrder);
        for (const action of sortedByOrder) {
            visit(action.id);
        }
        return result;
    }
    /**
     * Rollback a remediation plan
     */
    async rollbackPlan(planId) {
        const plan = this.activePlans.get(planId);
        if (!plan) {
            throw new Error(`Plan ${planId} not found`);
        }
        const results = [];
        // Rollback in reverse order
        const completedActions = plan.actions
            .filter((a) => a.status === 'completed' && a.result?.rollbackAvailable)
            .reverse();
        for (const action of completedActions) {
            const executor = this.executors.get(action.actionType);
            if (executor?.rollback) {
                try {
                    const result = await executor.rollback(action, action.target);
                    action.status = 'rolled_back';
                    results.push(result);
                }
                catch (error) {
                    logger_js_1.default.error('Rollback failed', {
                        actionId: action.id,
                        error: error.message,
                    });
                }
            }
        }
        plan.status = 'rolled_back';
        this.emit('plan_rolled_back', { planId, results });
        return results;
    }
    /**
     * Get active plans
     */
    getActivePlans() {
        return Array.from(this.activePlans.values());
    }
    /**
     * Get pending approvals
     */
    getPendingApprovals() {
        return Array.from(this.approvalQueue.values());
    }
    /**
     * Helper to generate random severity
     */
    randomSeverity() {
        const severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
        return severities[Math.floor(Math.random() * severities.length)];
    }
}
exports.AutoRemediationHooks = AutoRemediationHooks;
exports.autoRemediationHooks = new AutoRemediationHooks();
