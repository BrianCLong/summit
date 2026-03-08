"use strict";
// Maestro Conductor v24.3.0 - Migration Gates System
// Epic E17: Schema Evolution - Automated migration safety gates and rollback triggers
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrationGates = exports.MigrationGatesSystem = void 0;
const api_1 = require("@opentelemetry/api");
const prom_client_1 = require("prom-client");
const contractTesting_js_1 = require("../testing/contractTesting.js");
const migrationFramework_js_1 = require("../migrations/migrationFramework.js");
const events_1 = require("events");
const pubsub_js_1 = require("../subscriptions/pubsub.js");
const tracer = api_1.trace.getTracer('migration-gates', '24.3.0');
// Metrics
const gateExecutions = new prom_client_1.Counter({
    name: 'migration_gate_executions_total',
    help: 'Total migration gate executions',
    labelNames: ['tenant_id', 'gate_type', 'migration_id', 'result'],
});
const gateExecutionTime = new prom_client_1.Histogram({
    name: 'migration_gate_execution_time_seconds',
    help: 'Migration gate execution time',
    buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 300],
    labelNames: ['gate_type', 'check_type'],
});
const activeGates = new prom_client_1.Gauge({
    name: 'active_migration_gates',
    help: 'Currently active migration gates',
    labelNames: ['tenant_id', 'migration_id'],
});
const gateViolations = new prom_client_1.Counter({
    name: 'migration_gate_violations_total',
    help: 'Total migration gate violations',
    labelNames: ['tenant_id', 'gate_type', 'violation_type', 'severity'],
});
class MigrationGatesSystem extends events_1.EventEmitter {
    gates = new Map();
    rollbackConditions = new Map();
    executionHistory = [];
    monitoringInterval = null;
    constructor() {
        super();
        this.initializeDefaultGates();
        this.startContinuousMonitoring();
    }
    registerGate(gate) {
        this.validateGate(gate);
        this.gates.set(gate.id, gate);
        this.emit('gateRegistered', gate);
    }
    async executeGate(gateId, migrationId, tenantId, context) {
        return tracer.startActiveSpan('migration_gates.execute_gate', async (span) => {
            span.setAttributes({
                tenant_id: tenantId,
                migration_id: migrationId,
                gate_id: gateId,
            });
            activeGates.inc({ tenant_id: tenantId, migration_id: migrationId });
            const startTime = Date.now();
            try {
                const gate = this.gates.get(gateId);
                if (!gate) {
                    throw new Error(`Gate not found: ${gateId}`);
                }
                if (!gate.enabled) {
                    span.setAttributes({ gate_disabled: true });
                    return this.createSkippedExecution(gate, migrationId, tenantId, 'Gate disabled');
                }
                const execution = {
                    gateId,
                    migrationId,
                    tenantId,
                    executedAt: new Date(),
                    result: 'error',
                    score: 0,
                    conditionResults: [],
                    actionsTriggered: [],
                };
                // Execute conditions
                let totalScore = 0;
                let totalWeight = 0;
                let hasRequiredFailure = false;
                for (const condition of gate.conditions) {
                    const conditionStart = Date.now();
                    try {
                        const conditionResult = await this.executeCondition(condition, migrationId, tenantId, context);
                        execution.conditionResults.push(conditionResult);
                        // Calculate weighted score
                        if (conditionResult.result === 'pass') {
                            totalScore += condition.weight * 100;
                        }
                        else if (conditionResult.result === 'warn') {
                            totalScore += condition.weight * 50;
                        }
                        // Fail = 0 points
                        totalWeight += condition.weight;
                        // Check for required condition failure
                        if (condition.required && conditionResult.result === 'fail') {
                            hasRequiredFailure = true;
                        }
                        gateExecutionTime.observe({ gate_type: gate.type, check_type: condition.type }, (Date.now() - conditionStart) / 1000);
                    }
                    catch (error) {
                        execution.conditionResults.push({
                            conditionId: condition.id,
                            result: 'error',
                            message: error.message,
                            executionTime: Date.now() - conditionStart,
                        });
                        if (condition.required) {
                            hasRequiredFailure = true;
                        }
                    }
                }
                // Calculate final score and result
                execution.score = totalWeight > 0 ? totalScore / totalWeight : 0;
                if (hasRequiredFailure) {
                    execution.result = 'fail';
                }
                else if (execution.score >= 80) {
                    execution.result = 'pass';
                }
                else if (execution.score >= 60) {
                    execution.result = 'warn';
                }
                else {
                    execution.result = 'fail';
                }
                execution.completedAt = new Date();
                // Execute actions based on result
                await this.executeActions(gate, execution);
                // Store execution
                this.executionHistory.push(execution);
                this.pruneExecutionHistory();
                // Record metrics
                gateExecutions.inc({
                    tenant_id: tenantId,
                    gate_type: gate.type,
                    migration_id: migrationId,
                    result: execution.result,
                });
                // Check for rollback conditions
                if (execution.result === 'fail' && gate.settings.rollbackOnFailure) {
                    await this.triggerRollback(migrationId, tenantId, 'gate_failure');
                    execution.rollbackTriggered = true;
                }
                span.setAttributes({
                    gate_result: execution.result,
                    gate_score: execution.score,
                    conditions_executed: execution.conditionResults.length,
                    rollback_triggered: execution.rollbackTriggered || false,
                });
                this.emit('gateExecuted', execution);
                return execution;
            }
            catch (error) {
                span.recordException(error);
                span.setStatus({ code: 2, message: error.message });
                throw error;
            }
            finally {
                activeGates.dec({ tenant_id: tenantId, migration_id: migrationId });
                span.end();
            }
        });
    }
    async executeCondition(condition, migrationId, tenantId, context) {
        const startTime = Date.now();
        try {
            let result = 'error';
            let value;
            let message;
            switch (condition.type) {
                case 'contract_test':
                    const contractResult = await this.executeContractTest(condition.config, tenantId);
                    result =
                        contractResult.passed ===
                            contractResult.failed + contractResult.errors
                            ? 'pass'
                            : 'fail';
                    value = contractResult;
                    message = `Contracts: ${contractResult.passed} passed, ${contractResult.failed} failed`;
                    break;
                case 'health_check':
                    const healthResult = await this.executeHealthCheck(condition.config, tenantId);
                    result = healthResult.healthy ? 'pass' : 'fail';
                    value = healthResult;
                    message = healthResult.message || 'Health check completed';
                    break;
                case 'metric_threshold':
                    const metricResult = await this.executeMetricThreshold(condition.config, tenantId);
                    result = metricResult.withinThreshold ? 'pass' : 'fail';
                    value = metricResult;
                    message = `Metric ${condition.config.metric}: ${metricResult.value} ${metricResult.withinThreshold ? '≤' : '>'} ${metricResult.threshold}`;
                    break;
                case 'manual_approval':
                    const approvalResult = await this.checkManualApproval(condition.config, migrationId, tenantId);
                    result = approvalResult.approved ? 'pass' : 'warn';
                    value = approvalResult;
                    message = approvalResult.approved ? 'Approved' : 'Pending approval';
                    break;
                case 'dependency_check':
                    const depResult = await this.executeDependencyCheck(condition.config, tenantId);
                    result = depResult.allHealthy ? 'pass' : 'fail';
                    value = depResult;
                    message = `Dependencies: ${depResult.healthyCount}/${depResult.totalCount} healthy`;
                    break;
                default:
                    throw new Error(`Unsupported condition type: ${condition.type}`);
            }
            return {
                conditionId: condition.id,
                result,
                value,
                message,
                executionTime: Date.now() - startTime,
            };
        }
        catch (error) {
            return {
                conditionId: condition.id,
                result: 'error',
                message: error.message,
                executionTime: Date.now() - startTime,
            };
        }
    }
    async executeContractTest(config, tenantId) {
        if (config.contractId) {
            return await contractTesting_js_1.contractTesting.testContract(config.contractId, tenantId);
        }
        else if (config.contractType) {
            const results = await contractTesting_js_1.contractTesting.testAllContracts(tenantId, config.contractType);
            // Aggregate results
            return results.reduce((combined, result) => ({
                contractId: 'multiple',
                tenantId,
                passed: combined.passed + result.passed,
                failed: combined.failed + result.failed,
                errors: combined.errors + result.errors,
                skipped: combined.skipped + result.skipped,
                violations: [...combined.violations, ...result.violations],
                executionTime: combined.executionTime + result.executionTime,
                summary: {
                    critical: combined.summary.critical + result.summary.critical,
                    high: combined.summary.high + result.summary.high,
                    medium: combined.summary.medium + result.summary.medium,
                    low: combined.summary.low + result.summary.low,
                },
            }), {
                contractId: 'multiple',
                tenantId,
                passed: 0,
                failed: 0,
                errors: 0,
                skipped: 0,
                violations: [],
                executionTime: 0,
                summary: { critical: 0, high: 0, medium: 0, low: 0 },
            });
        }
        throw new Error('Contract test configuration requires contractId or contractType');
    }
    async executeHealthCheck(config, tenantId) {
        // Implement health checks for various services
        const services = config.services || ['database', 'cache', 'queue'];
        const results = [];
        for (const service of services) {
            try {
                switch (service) {
                    case 'database':
                        // Check database connectivity
                        const dbHealth = await this.checkDatabaseHealth();
                        results.push({
                            service,
                            healthy: dbHealth.healthy,
                            details: dbHealth,
                        });
                        break;
                    case 'cache':
                        // Check Redis connectivity
                        const cacheHealth = await this.checkCacheHealth();
                        results.push({
                            service,
                            healthy: cacheHealth.healthy,
                            details: cacheHealth,
                        });
                        break;
                    case 'queue':
                        // Check message queue health
                        results.push({
                            service: 'queue',
                            healthy: true,
                            details: { status: 'ok' },
                        });
                        break;
                }
            }
            catch (error) {
                results.push({
                    service,
                    healthy: false,
                    details: { error: error.message },
                });
            }
        }
        const allHealthy = results.every((r) => r.healthy);
        const healthyCount = results.filter((r) => r.healthy).length;
        return {
            healthy: allHealthy,
            message: `${healthyCount}/${results.length} services healthy`,
            details: results,
        };
    }
    async executeMetricThreshold(config, tenantId) {
        // This would integrate with your metrics system (Prometheus, etc.)
        // For now, return mock data
        const mockValue = Math.random() * 100;
        return {
            withinThreshold: mockValue <= config.threshold,
            value: mockValue,
            threshold: config.threshold,
            metric: config.metric,
        };
    }
    async checkManualApproval(config, migrationId, tenantId) {
        // Check for manual approval in Redis or database
        const approvalKey = `approval:${tenantId}:${migrationId}`;
        try {
            const approval = await pubsub_js_1.redis.get(approvalKey);
            if (approval) {
                const parsed = JSON.parse(approval);
                return {
                    approved: true,
                    approver: parsed.approver,
                    approvedAt: new Date(parsed.approvedAt),
                };
            }
        }
        catch (error) {
            console.error('Error checking manual approval:', error);
        }
        return { approved: false };
    }
    async executeDependencyCheck(config, tenantId) {
        const dependencies = config.dependencies || [];
        const results = [];
        for (const dep of dependencies) {
            try {
                // Mock dependency health check
                const healthy = Math.random() > 0.1; // 90% success rate
                results.push({
                    name: dep.name,
                    healthy,
                    url: dep.url,
                    responseTime: Math.floor(Math.random() * 200),
                });
            }
            catch (error) {
                results.push({
                    name: dep.name,
                    healthy: false,
                    error: error.message,
                });
            }
        }
        const healthyCount = results.filter((r) => r.healthy).length;
        return {
            allHealthy: healthyCount === results.length,
            healthyCount,
            totalCount: results.length,
            details: results,
        };
    }
    async executeActions(gate, execution) {
        const applicableActions = gate.actions.filter((action) => {
            switch (action.condition) {
                case 'on_pass':
                    return execution.result === 'pass';
                case 'on_fail':
                    return execution.result === 'fail';
                case 'on_warn':
                    return execution.result === 'warn';
                case 'always':
                    return true;
                default:
                    return false;
            }
        });
        for (const action of applicableActions) {
            try {
                await this.executeAction(action, execution);
                execution.actionsTriggered.push(action.id);
            }
            catch (error) {
                console.error(`Failed to execute action ${action.id}:`, error);
            }
        }
    }
    async executeAction(action, execution) {
        switch (action.type) {
            case 'notify':
                console.log(`NOTIFICATION: Gate ${execution.gateId} ${execution.result} for migration ${execution.migrationId}`);
                break;
            case 'rollback':
                await this.triggerRollback(execution.migrationId, execution.tenantId, 'gate_action');
                break;
            case 'pause':
                // Would pause the migration execution
                console.log(`PAUSE: Migration ${execution.migrationId} paused by gate ${execution.gateId}`);
                break;
            case 'log':
                console.log(`LOG: ${action.config.message || `Gate ${execution.gateId} executed`}`, execution);
                break;
            case 'webhook':
                // Would send webhook notification
                console.log(`WEBHOOK: Sending to ${action.config.url}`, { execution });
                break;
            case 'metric_alert':
                console.log(`METRIC_ALERT: ${action.config.alert}`, execution);
                break;
        }
    }
    async triggerRollback(migrationId, tenantId, reason) {
        try {
            console.log(`Triggering rollback for migration ${migrationId} (${reason})`);
            await migrationFramework_js_1.migrationFramework.rollbackMigration(migrationId, tenantId);
            this.emit('rollbackTriggered', {
                migrationId,
                tenantId,
                reason,
                triggeredAt: new Date(),
            });
        }
        catch (error) {
            console.error(`Failed to rollback migration ${migrationId}:`, error);
        }
    }
    async checkDatabaseHealth() {
        try {
            const start = Date.now();
            // Simple health check query
            await Promise.all([
            // PostgreSQL health check would go here
            // Neo4j health check would go here
            ]);
            return { healthy: true, latency: Date.now() - start };
        }
        catch (error) {
            return { healthy: false, error: error.message };
        }
    }
    async checkCacheHealth() {
        try {
            const start = Date.now();
            await pubsub_js_1.redis.ping();
            return { healthy: true, latency: Date.now() - start };
        }
        catch (error) {
            return { healthy: false, error: error.message };
        }
    }
    createSkippedExecution(gate, migrationId, tenantId, reason) {
        return {
            gateId: gate.id,
            migrationId,
            tenantId,
            executedAt: new Date(),
            completedAt: new Date(),
            result: 'pass',
            score: 100,
            conditionResults: [],
            actionsTriggered: [],
            error: reason,
        };
    }
    validateGate(gate) {
        if (!gate.id)
            throw new Error('Gate ID is required');
        if (!gate.name)
            throw new Error('Gate name is required');
        if (!gate.conditions || gate.conditions.length === 0) {
            throw new Error('Gate must have at least one condition');
        }
        for (const condition of gate.conditions) {
            if (!condition.id)
                throw new Error('Condition ID is required');
            if (!condition.type)
                throw new Error('Condition type is required');
            if (condition.weight < 0)
                throw new Error('Condition weight must be non-negative');
        }
    }
    pruneExecutionHistory() {
        // Keep only last 1000 executions
        if (this.executionHistory.length > 1000) {
            this.executionHistory = this.executionHistory.slice(-1000);
        }
    }
    initializeDefaultGates() {
        // Pre-migration gate
        this.registerGate({
            id: 'pre_migration_standard',
            name: 'Standard Pre-Migration Gate',
            type: 'pre_migration',
            description: 'Standard checks before migration execution',
            enabled: true,
            priority: 1,
            conditions: [
                {
                    id: 'health_check',
                    name: 'System Health Check',
                    type: 'health_check',
                    config: { services: ['database', 'cache'] },
                    weight: 30,
                    required: true,
                },
                {
                    id: 'contract_validation',
                    name: 'Contract Validation',
                    type: 'contract_test',
                    config: { contractType: 'database' },
                    weight: 40,
                    required: true,
                },
                {
                    id: 'dependency_check',
                    name: 'Dependency Health',
                    type: 'dependency_check',
                    config: { dependencies: [] },
                    weight: 30,
                    required: false,
                },
            ],
            actions: [
                {
                    id: 'log_result',
                    name: 'Log Result',
                    type: 'log',
                    config: { level: 'info' },
                    condition: 'always',
                },
                {
                    id: 'notify_failure',
                    name: 'Notify on Failure',
                    type: 'notify',
                    config: { channel: 'alerts' },
                    condition: 'on_fail',
                },
            ],
            metadata: {
                createdAt: new Date(),
                updatedAt: new Date(),
                author: 'system',
                version: '1.0.0',
            },
            settings: {
                timeout: 300000, // 5 minutes
                retryCount: 2,
                retryDelay: 5000,
                failureBehavior: 'block',
                rollbackOnFailure: false,
            },
        });
        // Post-migration gate
        this.registerGate({
            id: 'post_migration_standard',
            name: 'Standard Post-Migration Gate',
            type: 'post_migration',
            description: 'Standard checks after migration execution',
            enabled: true,
            priority: 1,
            conditions: [
                {
                    id: 'contract_validation',
                    name: 'Contract Validation',
                    type: 'contract_test',
                    config: { contractType: 'database' },
                    weight: 50,
                    required: true,
                },
                {
                    id: 'performance_check',
                    name: 'Performance Check',
                    type: 'metric_threshold',
                    config: { metric: 'response_time', threshold: 500 },
                    weight: 30,
                    required: false,
                },
                {
                    id: 'health_check',
                    name: 'Post-Migration Health',
                    type: 'health_check',
                    config: { services: ['database', 'cache'] },
                    weight: 20,
                    required: true,
                },
            ],
            actions: [
                {
                    id: 'rollback_on_failure',
                    name: 'Rollback on Critical Failure',
                    type: 'rollback',
                    config: {},
                    condition: 'on_fail',
                },
                {
                    id: 'log_result',
                    name: 'Log Result',
                    type: 'log',
                    config: { level: 'info' },
                    condition: 'always',
                },
            ],
            metadata: {
                createdAt: new Date(),
                updatedAt: new Date(),
                author: 'system',
                version: '1.0.0',
            },
            settings: {
                timeout: 300000,
                retryCount: 1,
                retryDelay: 10000,
                failureBehavior: 'block',
                rollbackOnFailure: true,
            },
        });
    }
    startContinuousMonitoring() {
        this.monitoringInterval = setInterval(async () => {
            try {
                await this.checkContinuousConditions();
            }
            catch (error) {
                console.error('Continuous monitoring error:', error);
            }
        }, 30000); // Check every 30 seconds
    }
    async checkContinuousConditions() {
        // Check rollback conditions for active migrations
        const runningMigrations = await migrationFramework_js_1.migrationFramework.listRunningMigrations();
        for (const migration of runningMigrations) {
            for (const condition of this.rollbackConditions.values()) {
                if (condition.enabled) {
                    const shouldRollback = await this.evaluateRollbackCondition(condition, migration);
                    if (shouldRollback) {
                        await this.triggerRollback(migration.migrationId, migration.tenantId, condition.trigger);
                    }
                }
            }
        }
    }
    async evaluateRollbackCondition(condition, migration) {
        // Implementation would check actual metrics and thresholds
        // For now, return false to avoid automatic rollbacks
        return false;
    }
    async executePreMigrationGates(migrationId, tenantId) {
        const preGates = Array.from(this.gates.values())
            .filter((gate) => gate.type === 'pre_migration' && gate.enabled)
            .sort((a, b) => a.priority - b.priority);
        for (const gate of preGates) {
            const execution = await this.executeGate(gate.id, migrationId, tenantId);
            if (execution.result === 'fail' &&
                gate.settings.failureBehavior === 'block') {
                return false;
            }
        }
        return true;
    }
    async executePostMigrationGates(migrationId, tenantId) {
        const postGates = Array.from(this.gates.values())
            .filter((gate) => gate.type === 'post_migration' && gate.enabled)
            .sort((a, b) => a.priority - b.priority);
        for (const gate of postGates) {
            const execution = await this.executeGate(gate.id, migrationId, tenantId);
            if (execution.result === 'fail' &&
                gate.settings.failureBehavior === 'block') {
                return false;
            }
        }
        return true;
    }
    getExecutionHistory(migrationId, tenantId) {
        let filtered = this.executionHistory;
        if (migrationId) {
            filtered = filtered.filter((e) => e.migrationId === migrationId);
        }
        if (tenantId) {
            filtered = filtered.filter((e) => e.tenantId === tenantId);
        }
        return filtered.sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime());
    }
    generateGateReport(executions) {
        const totalExecutions = executions.length;
        const passed = executions.filter((e) => e.result === 'pass').length;
        const passRate = totalExecutions > 0 ? (passed / totalExecutions) * 100 : 0;
        const averageScore = totalExecutions > 0
            ? executions.reduce((sum, e) => sum + e.score, 0) / totalExecutions
            : 0;
        const rollbacksTriggered = executions.filter((e) => e.rollbackTriggered).length;
        // Analyze common failure reasons
        const failureReasons = new Map();
        executions
            .filter((e) => e.result === 'fail')
            .forEach((e) => {
            const reason = e.error || 'Unknown failure';
            failureReasons.set(reason, (failureReasons.get(reason) || 0) + 1);
        });
        const commonFailureReasons = Array.from(failureReasons.entries())
            .map(([reason, count]) => ({ reason, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        return {
            totalExecutions,
            passRate,
            averageScore,
            rollbacksTriggered,
            commonFailureReasons,
        };
    }
    cleanup() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }
}
exports.MigrationGatesSystem = MigrationGatesSystem;
exports.migrationGates = new MigrationGatesSystem();
