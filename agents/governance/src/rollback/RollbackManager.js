"use strict";
/**
 * Auto-Rollback Manager
 *
 * Provides automatic rollback capabilities for AI agent fleets with
 * checkpoint management, circuit breakers, and verification.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rollbackManager = exports.RollbackManager = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
// ============================================================================
// Configuration
// ============================================================================
const DEFAULT_CONFIG = {
    enabled: true,
    triggers: [
        {
            trigger: 'policy_violation',
            threshold: 10,
            window: 300_000, // 5 minutes
            cooldown: 600_000, // 10 minutes
            enabled: true,
        },
        {
            trigger: 'hallucination_threshold',
            threshold: 5,
            window: 300_000,
            cooldown: 600_000,
            enabled: true,
        },
        {
            trigger: 'error_rate_exceeded',
            threshold: 0.1, // 10% error rate
            window: 60_000, // 1 minute
            cooldown: 300_000, // 5 minutes
            enabled: true,
        },
        {
            trigger: 'safety_breach',
            threshold: 1,
            window: 60_000,
            cooldown: 3600_000, // 1 hour
            enabled: true,
        },
        {
            trigger: 'circuit_breaker',
            threshold: 3, // 3 consecutive failures
            window: 30_000,
            cooldown: 60_000,
            enabled: true,
        },
    ],
    scope: 'agent',
    retentionCheckpoints: 10,
    autoApprove: false,
    notifyChannels: [],
    dryRunFirst: true,
};
// ============================================================================
// Rollback Manager
// ============================================================================
class RollbackManager {
    config;
    checkpoints;
    rollbacks;
    triggerCounts;
    cooldowns;
    eventListeners;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.checkpoints = new Map();
        this.rollbacks = new Map();
        this.triggerCounts = new Map();
        this.cooldowns = new Map();
        this.eventListeners = [];
    }
    /**
     * Create a checkpoint for an agent or fleet
     */
    async createCheckpoint(params) {
        const checkpoint = {
            id: `CP-${Date.now()}-${node_crypto_1.default.randomUUID().substring(0, 8)}`,
            createdAt: new Date(),
            createdBy: params.createdBy,
            scope: params.scope,
            agentId: params.agentId,
            fleetId: params.fleetId,
            state: {
                version: this.generateVersion(),
                configHash: this.hashState(params.state),
                timestamp: new Date(),
                snapshot: params.state,
            },
            metadata: {},
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        };
        // Store checkpoint
        const key = this.getCheckpointKey(params.scope, params.agentId, params.fleetId);
        const existing = this.checkpoints.get(key) || [];
        existing.push(checkpoint);
        // Enforce retention limit
        if (existing.length > this.config.retentionCheckpoints) {
            existing.shift(); // Remove oldest
        }
        this.checkpoints.set(key, existing);
        return checkpoint;
    }
    /**
     * Check if a rollback should be triggered
     */
    async checkTrigger(trigger, context) {
        const triggerConfig = this.config.triggers.find((t) => t.trigger === trigger);
        if (!triggerConfig || !triggerConfig.enabled) {
            return false;
        }
        const key = this.getTriggerKey(trigger, context.agentId, context.fleetId);
        // Check cooldown
        const cooldownExpiry = this.cooldowns.get(key);
        if (cooldownExpiry && Date.now() < cooldownExpiry) {
            return false;
        }
        // Get or initialize trigger count
        let triggerData = this.triggerCounts.get(key);
        if (!triggerData || Date.now() - triggerData.lastTriggered > triggerConfig.window) {
            triggerData = { count: 0, lastTriggered: Date.now() };
        }
        // Increment count
        triggerData.count++;
        triggerData.lastTriggered = Date.now();
        this.triggerCounts.set(key, triggerData);
        // Check threshold
        const exceeded = triggerData.count >= triggerConfig.threshold;
        if (exceeded) {
            // Set cooldown
            this.cooldowns.set(key, Date.now() + triggerConfig.cooldown);
            // Reset count
            this.triggerCounts.delete(key);
        }
        return exceeded;
    }
    /**
     * Initiate a rollback
     */
    async initiateRollback(params) {
        // Get checkpoint to roll back to
        const checkpoint = params.checkpointId
            ? this.getCheckpointById(params.checkpointId)
            : this.getLatestCheckpoint(params.scope, params.agentId, params.fleetId);
        if (!checkpoint) {
            throw new Error('No checkpoint available for rollback');
        }
        // Get current state
        const currentState = await this.getCurrentState(params.scope, params.agentId, params.fleetId);
        const rollback = {
            id: `RB-${Date.now()}-${node_crypto_1.default.randomUUID().substring(0, 8)}`,
            trigger: params.trigger,
            scope: params.scope,
            status: 'pending',
            initiatedAt: new Date(),
            initiatedBy: params.initiatedBy,
            reason: params.reason,
            affectedAgents: params.agentId ? [params.agentId] : [],
            affectedFleets: params.fleetId ? [params.fleetId] : [],
            checkpointId: checkpoint.id,
            targetState: checkpoint.state,
            currentState,
            steps: this.generateRollbackSteps(params.scope, checkpoint),
        };
        this.rollbacks.set(rollback.id, rollback);
        // Emit event
        this.emitEvent({
            id: node_crypto_1.default.randomUUID(),
            timestamp: new Date(),
            type: 'rollback_initiated',
            source: 'RollbackManager',
            agentId: params.agentId,
            fleetId: params.fleetId,
            actor: params.initiatedBy,
            action: 'initiate_rollback',
            resource: rollback.id,
            outcome: 'success',
            classification: 'UNCLASSIFIED',
            details: {
                trigger: params.trigger,
                scope: params.scope,
                reason: params.reason,
                checkpointId: checkpoint.id,
            },
        });
        // Execute if auto-approve or dry-run first
        if (this.config.dryRunFirst) {
            await this.dryRun(rollback);
        }
        if (this.config.autoApprove) {
            await this.executeRollback(rollback.id, params.initiatedBy);
        }
        return rollback;
    }
    /**
     * Execute a rollback
     */
    async executeRollback(rollbackId, executor) {
        const rollback = this.rollbacks.get(rollbackId);
        if (!rollback) {
            throw new Error(`Rollback not found: ${rollbackId}`);
        }
        if (rollback.status !== 'pending') {
            throw new Error(`Rollback ${rollbackId} is not in pending status`);
        }
        rollback.status = 'in_progress';
        try {
            // Execute each step
            for (const step of rollback.steps) {
                step.status = 'in_progress';
                step.startedAt = new Date();
                try {
                    await this.executeStep(step, rollback);
                    step.status = 'completed';
                    step.completedAt = new Date();
                    step.result = 'Success';
                }
                catch (error) {
                    step.status = 'failed';
                    step.completedAt = new Date();
                    step.error = error instanceof Error ? error.message : String(error);
                    // Fail the entire rollback
                    rollback.status = 'failed';
                    break;
                }
            }
            // If all steps completed, verify
            if (rollback.steps.every((s) => s.status === 'completed')) {
                rollback.verification = await this.verifyRollback(rollback);
                rollback.status = rollback.verification.verified ? 'completed' : 'failed';
                rollback.completedAt = new Date();
            }
        }
        catch (error) {
            rollback.status = 'failed';
        }
        this.rollbacks.set(rollbackId, rollback);
        // Emit completion event
        this.emitEvent({
            id: node_crypto_1.default.randomUUID(),
            timestamp: new Date(),
            type: 'rollback_completed',
            source: 'RollbackManager',
            actor: executor,
            action: 'execute_rollback',
            resource: rollbackId,
            outcome: rollback.status === 'completed' ? 'success' : 'failure',
            classification: 'UNCLASSIFIED',
            details: {
                status: rollback.status,
                stepsCompleted: rollback.steps.filter((s) => s.status === 'completed').length,
                verification: rollback.verification,
            },
        });
        return rollback;
    }
    /**
     * Perform a dry-run of the rollback
     */
    async dryRun(rollback) {
        const issues = [];
        // Validate checkpoint exists and is valid
        const checkpoint = this.getCheckpointById(rollback.checkpointId);
        if (!checkpoint) {
            issues.push('Checkpoint not found');
        }
        // Validate state compatibility
        if (checkpoint && rollback.currentState) {
            const stateValid = this.validateStateCompatibility(rollback.currentState, checkpoint.state);
            if (!stateValid) {
                issues.push('State incompatibility detected');
            }
        }
        // Validate steps are executable
        for (const step of rollback.steps) {
            if (!this.canExecuteStep(step)) {
                issues.push(`Step ${step.id} cannot be executed: ${step.action}`);
            }
        }
        return {
            success: issues.length === 0,
            issues,
        };
    }
    /**
     * Execute a rollback step
     */
    async executeStep(step, rollback) {
        switch (step.action) {
            case 'stop_agent':
                await this.stopAgent(rollback.affectedAgents);
                break;
            case 'restore_config':
                await this.restoreConfig(rollback.targetState);
                break;
            case 'clear_cache':
                await this.clearCache(rollback.scope, rollback.affectedAgents, rollback.affectedFleets);
                break;
            case 'restart_agent':
                await this.restartAgent(rollback.affectedAgents);
                break;
            case 'verify_state':
                // Verification happens separately
                break;
            default:
                console.log(`[Rollback] Executing step: ${step.action}`);
        }
    }
    /**
     * Stop agents
     */
    async stopAgent(agentIds) {
        for (const agentId of agentIds) {
            console.log(`[Rollback] Stopping agent: ${agentId}`);
            // Implementation would integrate with agent runtime
        }
    }
    /**
     * Restore configuration from checkpoint
     */
    async restoreConfig(targetState) {
        console.log(`[Rollback] Restoring config to version: ${targetState.version}`);
        // Implementation would apply configuration
    }
    /**
     * Clear caches
     */
    async clearCache(scope, agentIds, fleetIds) {
        console.log(`[Rollback] Clearing caches for scope: ${scope}`);
        // Implementation would clear relevant caches
    }
    /**
     * Restart agents
     */
    async restartAgent(agentIds) {
        for (const agentId of agentIds) {
            console.log(`[Rollback] Restarting agent: ${agentId}`);
            // Implementation would restart agents
        }
    }
    /**
     * Verify rollback was successful
     */
    async verifyRollback(rollback) {
        const checks = [];
        // Check state matches target
        const currentState = await this.getCurrentState(rollback.scope, rollback.affectedAgents[0], rollback.affectedFleets[0]);
        checks.push({
            name: 'state_match',
            passed: currentState.configHash === rollback.targetState.configHash,
            result: currentState.configHash === rollback.targetState.configHash
                ? 'State matches target'
                : 'State mismatch',
        });
        // Check agents are healthy
        for (const agentId of rollback.affectedAgents) {
            const healthy = await this.checkAgentHealth(agentId);
            checks.push({
                name: `agent_health_${agentId}`,
                passed: healthy,
                result: healthy ? 'Agent healthy' : 'Agent unhealthy',
            });
        }
        // Determine overall health
        const allPassed = checks.every((c) => c.passed);
        return {
            verified: allPassed,
            verifiedAt: new Date(),
            verifiedBy: 'system',
            checks,
            overallHealth: allPassed ? 'healthy' : 'degraded',
        };
    }
    /**
     * Check agent health
     */
    async checkAgentHealth(agentId) {
        // Implementation would check actual agent health
        return true;
    }
    /**
     * Generate rollback steps based on scope
     */
    generateRollbackSteps(scope, checkpoint) {
        const steps = [];
        switch (scope) {
            case 'agent':
                steps.push({ id: '1', sequence: 1, action: 'stop_agent', status: 'pending' }, { id: '2', sequence: 2, action: 'restore_config', status: 'pending' }, { id: '3', sequence: 3, action: 'clear_cache', status: 'pending' }, { id: '4', sequence: 4, action: 'restart_agent', status: 'pending' }, { id: '5', sequence: 5, action: 'verify_state', status: 'pending' });
                break;
            case 'fleet':
                steps.push({ id: '1', sequence: 1, action: 'pause_fleet', status: 'pending' }, { id: '2', sequence: 2, action: 'restore_fleet_config', status: 'pending' }, { id: '3', sequence: 3, action: 'clear_fleet_cache', status: 'pending' }, { id: '4', sequence: 4, action: 'resume_fleet', status: 'pending' }, { id: '5', sequence: 5, action: 'verify_fleet_state', status: 'pending' });
                break;
            case 'chain':
                steps.push({ id: '1', sequence: 1, action: 'abort_chain', status: 'pending' }, { id: '2', sequence: 2, action: 'restore_chain_config', status: 'pending' }, { id: '3', sequence: 3, action: 'verify_chain_state', status: 'pending' });
                break;
            default:
                steps.push({ id: '1', sequence: 1, action: 'restore_config', status: 'pending' }, { id: '2', sequence: 2, action: 'verify_state', status: 'pending' });
        }
        return steps;
    }
    /**
     * Get current state for scope
     */
    async getCurrentState(scope, agentId, fleetId) {
        // Implementation would fetch actual state
        return {
            version: this.generateVersion(),
            configHash: node_crypto_1.default.randomUUID(),
            timestamp: new Date(),
            snapshot: {},
        };
    }
    /**
     * Validate state compatibility
     */
    validateStateCompatibility(current, target) {
        // Check version compatibility
        const currentMajor = parseInt(current.version.split('.')[0]);
        const targetMajor = parseInt(target.version.split('.')[0]);
        return currentMajor === targetMajor;
    }
    /**
     * Check if step can be executed
     */
    canExecuteStep(step) {
        const validActions = [
            'stop_agent',
            'restore_config',
            'clear_cache',
            'restart_agent',
            'verify_state',
            'pause_fleet',
            'restore_fleet_config',
            'clear_fleet_cache',
            'resume_fleet',
            'verify_fleet_state',
            'abort_chain',
            'restore_chain_config',
            'verify_chain_state',
        ];
        return validActions.includes(step.action);
    }
    /**
     * Get checkpoint key
     */
    getCheckpointKey(scope, agentId, fleetId) {
        return `${scope}:${agentId || 'all'}:${fleetId || 'all'}`;
    }
    /**
     * Get trigger key
     */
    getTriggerKey(trigger, agentId, fleetId) {
        return `${trigger}:${agentId || 'all'}:${fleetId || 'all'}`;
    }
    /**
     * Get checkpoint by ID
     */
    getCheckpointById(id) {
        for (const checkpoints of this.checkpoints.values()) {
            const found = checkpoints.find((c) => c.id === id);
            if (found) {
                return found;
            }
        }
        return null;
    }
    /**
     * Get latest checkpoint for scope
     */
    getLatestCheckpoint(scope, agentId, fleetId) {
        const key = this.getCheckpointKey(scope, agentId, fleetId);
        const checkpoints = this.checkpoints.get(key);
        if (!checkpoints || checkpoints.length === 0) {
            return null;
        }
        return checkpoints[checkpoints.length - 1];
    }
    /**
     * Generate version string
     */
    generateVersion() {
        const date = new Date();
        return `1.${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
    }
    /**
     * Hash state for comparison
     */
    hashState(state) {
        return node_crypto_1.default.createHash('sha256').update(JSON.stringify(state)).digest('hex');
    }
    /**
     * Cancel a pending rollback
     */
    cancelRollback(rollbackId, canceller) {
        const rollback = this.rollbacks.get(rollbackId);
        if (!rollback || rollback.status !== 'pending') {
            return false;
        }
        rollback.status = 'cancelled';
        rollback.completedAt = new Date();
        this.rollbacks.set(rollbackId, rollback);
        return true;
    }
    /**
     * Get rollback by ID
     */
    getRollback(id) {
        return this.rollbacks.get(id) || null;
    }
    /**
     * Get all rollbacks
     */
    getAllRollbacks() {
        return Array.from(this.rollbacks.values());
    }
    /**
     * Get rollback metrics
     */
    getMetrics() {
        const rollbacks = Array.from(this.rollbacks.values());
        const byTrigger = {};
        let totalRecoveryTime = 0;
        let completedCount = 0;
        for (const rb of rollbacks) {
            byTrigger[rb.trigger] = (byTrigger[rb.trigger] || 0) + 1;
            if (rb.completedAt && rb.status === 'completed') {
                totalRecoveryTime += rb.completedAt.getTime() - rb.initiatedAt.getTime();
                completedCount++;
            }
        }
        return {
            total: rollbacks.length,
            successful: rollbacks.filter((r) => r.status === 'completed').length,
            failed: rollbacks.filter((r) => r.status === 'failed').length,
            pending: rollbacks.filter((r) => r.status === 'pending').length,
            avgRecoveryTime: completedCount > 0 ? totalRecoveryTime / completedCount : 0,
            byTrigger: byTrigger,
        };
    }
    /**
     * Add event listener
     */
    onEvent(listener) {
        this.eventListeners.push(listener);
    }
    /**
     * Emit event
     */
    emitEvent(event) {
        for (const listener of this.eventListeners) {
            try {
                listener(event);
            }
            catch (error) {
                console.error('Event listener error:', error);
            }
        }
    }
}
exports.RollbackManager = RollbackManager;
// ============================================================================
// Singleton Export
// ============================================================================
exports.rollbackManager = new RollbackManager();
