"use strict";
// Operational Runbook Execution Engine
// Executes predefined operational procedures and emergency responses
Object.defineProperty(exports, "__esModule", { value: true });
exports.runbookExecutor = exports.RunbookExecutor = void 0;
const events_1 = require("events");
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs_1 = require("fs");
const prometheus_js_1 = require("../observability/prometheus.js");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class RunbookExecutor extends events_1.EventEmitter {
    runbooks = new Map();
    executions = new Map();
    constructor() {
        super();
        this.loadBuiltinRunbooks();
    }
    /**
     * Execute runbook with context
     */
    async executeRunbook(runbookId, context, executedBy, approvedBy) {
        const runbook = this.runbooks.get(runbookId);
        if (!runbook) {
            throw new Error(`Runbook not found: ${runbookId}`);
        }
        // Check approval requirements
        if (runbook.approvalRequired && !approvedBy && !runbook.emergencyBypass) {
            throw new Error('Runbook requires approval to execute');
        }
        const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const execution = {
            id: executionId,
            runbookId,
            status: 'pending',
            startTime: Date.now(),
            executedBy,
            approvedBy,
            context,
            steps: runbook.steps.map((step) => ({
                stepId: step.id,
                status: 'pending',
                retryCount: 0,
            })),
            evidence: {},
            logs: [],
        };
        this.executions.set(executionId, execution);
        // Start execution
        this.startExecution(execution, runbook);
        return executionId;
    }
    /**
     * Start runbook execution
     */
    async startExecution(execution, runbook) {
        execution.status = 'running';
        this.addLog(execution, 'info', `Starting runbook: ${runbook.name}`);
        // Send start notifications
        await this.sendNotifications(runbook.notifications.onStart, execution, runbook);
        try {
            // Execute steps sequentially
            for (const step of runbook.steps) {
                const stepExecution = execution.steps.find((s) => s.stepId === step.id);
                // Check dependencies
                if (step.requires) {
                    const unmetDeps = step.requires.filter((reqId) => {
                        const reqStep = execution.steps.find((s) => s.stepId === reqId);
                        return !reqStep || reqStep.status !== 'completed';
                    });
                    if (unmetDeps.length > 0) {
                        this.addLog(execution, 'warn', `Skipping step ${step.name}: unmet dependencies ${unmetDeps.join(', ')}`);
                        stepExecution.status = 'skipped';
                        continue;
                    }
                }
                // Check conditions
                if (step.condition &&
                    !this.evaluateCondition(step.condition, execution.context)) {
                    this.addLog(execution, 'info', `Skipping step ${step.name}: condition not met`);
                    stepExecution.status = 'skipped';
                    continue;
                }
                // Execute step with retries
                const success = await this.executeStepWithRetries(execution, runbook, step);
                if (!success) {
                    if (step.onFailure === 'abort') {
                        execution.status = 'failed';
                        this.addLog(execution, 'error', 'Runbook aborted due to step failure');
                        await this.sendNotifications(runbook.notifications.onFailure, execution, runbook);
                        return;
                    }
                    if (step.onFailure === 'escalate') {
                        await this.escalateRunbook(execution, runbook, step);
                        return;
                    }
                }
            }
            // Runbook completed successfully
            execution.status = 'completed';
            execution.endTime = Date.now();
            this.addLog(execution, 'info', 'Runbook completed successfully');
            await this.sendNotifications(runbook.notifications.onSuccess, execution, runbook);
            this.emit('runbook:completed', execution);
        }
        catch (error) {
            execution.status = 'failed';
            execution.endTime = Date.now();
            this.addLog(execution, 'error', `Runbook failed: ${error.message}`);
            await this.sendNotifications(runbook.notifications.onFailure, execution, runbook);
            this.emit('runbook:failed', execution);
        }
        // Record metrics
        const duration = (execution.endTime || Date.now()) - execution.startTime;
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('runbook_executed');
    }
    /**
     * Execute step with retry logic
     */
    async executeStepWithRetries(execution, runbook, step) {
        const stepExecution = execution.steps.find((s) => s.stepId === step.id);
        stepExecution.status = 'running';
        stepExecution.startTime = Date.now();
        this.addLog(execution, 'info', `Executing step: ${step.name}`);
        for (let attempt = 0; attempt <= step.retries; attempt++) {
            if (attempt > 0) {
                this.addLog(execution, 'info', `Retrying step ${step.name} (attempt ${attempt + 1})`);
                stepExecution.retryCount++;
            }
            try {
                const result = await this.executeStep(execution, step);
                stepExecution.status = 'completed';
                stepExecution.endTime = Date.now();
                stepExecution.output = result.output;
                if (step.evidence) {
                    stepExecution.evidence = result.evidence;
                    execution.evidence[step.id] = result.evidence;
                }
                this.addLog(execution, 'info', `Step completed: ${step.name}`);
                return true;
            }
            catch (error) {
                stepExecution.error = error.message;
                this.addLog(execution, 'error', `Step failed: ${step.name} - ${error.message}`);
                if (attempt === step.retries) {
                    stepExecution.status = 'failed';
                    stepExecution.endTime = Date.now();
                    return false;
                }
                // Wait before retry
                await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
            }
        }
        return false;
    }
    /**
     * Execute individual step
     */
    async executeStep(execution, step) {
        const timeout = step.timeout;
        switch (step.type) {
            case 'command':
                return this.executeCommand(step, execution.context, timeout);
            case 'script':
                return this.executeScript(step, execution.context, timeout);
            case 'http':
                return this.executeHttpRequest(step, execution.context, timeout);
            case 'database':
                return this.executeDatabaseQuery(step, execution.context, timeout);
            case 'validation':
                return this.executeValidation(step, execution.context, timeout);
            case 'manual':
                return this.executeManualStep(step, execution.context);
            default:
                throw new Error(`Unknown step type: ${step.type}`);
        }
    }
    /**
     * Execute command step
     */
    async executeCommand(step, context, timeout) {
        if (!step.command) {
            throw new Error('Command step requires command property');
        }
        const command = this.interpolateTemplate(step.command, context);
        const { stdout, stderr } = await Promise.race([
            execAsync(command),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Command timeout')), timeout)),
        ]);
        return {
            output: stdout || stderr,
            evidence: {
                command,
                stdout,
                stderr,
                timestamp: Date.now(),
            },
        };
    }
    /**
     * Execute script step
     */
    async executeScript(step, context, timeout) {
        if (!step.script) {
            throw new Error('Script step requires script property');
        }
        const script = this.interpolateTemplate(step.script, context);
        const scriptFile = `/tmp/runbook_script_${Date.now()}.sh`;
        (0, fs_1.writeFileSync)(scriptFile, script, { mode: 0o755 });
        try {
            const { stdout, stderr } = await Promise.race([
                execAsync(`bash ${scriptFile}`),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Script timeout')), timeout)),
            ]);
            return {
                output: stdout || stderr,
                evidence: {
                    script,
                    stdout,
                    stderr,
                    timestamp: Date.now(),
                },
            };
        }
        finally {
            // Clean up script file
            try {
                execAsync(`rm -f ${scriptFile}`);
            }
            catch {
                // Ignore cleanup errors
            }
        }
    }
    /**
     * Execute HTTP request step
     */
    async executeHttpRequest(step, context, timeout) {
        if (!step.url) {
            throw new Error('HTTP step requires url property');
        }
        const url = this.interpolateTemplate(step.url, context);
        const method = step.method || 'GET';
        const headers = step.headers || {};
        const body = step.body ? JSON.stringify(step.body) : undefined;
        const response = await Promise.race([
            fetch(url, { method, headers, body }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('HTTP timeout')), timeout)),
        ]);
        const responseText = await response.text();
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${responseText}`);
        }
        return {
            output: responseText,
            evidence: {
                url,
                method,
                status: response.status,
                response: responseText,
                timestamp: Date.now(),
            },
        };
    }
    /**
     * Execute database query step
     */
    async executeDatabaseQuery(step, context, timeout) {
        // Placeholder for database query execution
        // Implementation would depend on database type and connection
        return {
            output: 'Database query executed',
            evidence: {
                query: step.instruction,
                timestamp: Date.now(),
            },
        };
    }
    /**
     * Execute validation step
     */
    async executeValidation(step, context, timeout) {
        const validation = this.interpolateTemplate(step.instruction, context);
        // Safer validation using expression evaluator
        try {
            const result = this.evaluateCondition(validation, context);
            if (!result) {
                throw new Error('Validation failed');
            }
            return {
                output: 'Validation passed',
                evidence: {
                    validation,
                    result,
                    timestamp: Date.now(),
                },
            };
        }
        catch (error) {
            throw new Error(`Validation error: ${error.message}`);
        }
    }
    /**
     * Evaluate a simple boolean expression against the provided context.
     * Supports JS boolean operators and dot-path lookups from context only.
     */
    evaluateCondition(expr, context) {
        // Basic guardrails against unsafe tokens
        const forbidden = /(process|require|global|window|this|constructor|Function|eval)/i;
        if (forbidden.test(expr))
            throw new Error('Forbidden token in condition');
        // Expose context as a variable; no with(), no global access
        const fn = new Function('context', `"use strict"; const get=(p)=>p.split('.').reduce((a,k)=>a?.[k], context);
      const ctx=context; const $=get; return !!(${expr});`);
        try {
            return !!fn(context);
        }
        catch (e) {
            throw new Error(`Condition eval error: ${e.message}`);
        }
    }
    /**
     * Execute manual step (requires human intervention)
     */
    async executeManualStep(step, context) {
        // Manual steps are marked as completed immediately
        // In a real implementation, this would wait for human confirmation
        console.log(`MANUAL STEP: ${step.name} - ${step.instruction}`);
        return {
            output: 'Manual step acknowledged',
            evidence: {
                instruction: step.instruction,
                timestamp: Date.now(),
            },
        };
    }
    /**
     * Load built-in runbooks
     */
    loadBuiltinRunbooks() {
        // Emergency containment runbook
        this.registerRunbook({
            id: 'emergency_containment',
            name: 'Emergency System Containment',
            description: 'Immediate containment procedures for critical security incidents',
            category: 'security',
            severity: 'critical',
            estimatedDuration: 10,
            prerequisites: ['Admin access', 'Incident confirmation'],
            approvalRequired: false,
            emergencyBypass: true,
            steps: [
                {
                    id: 'enable_maintenance',
                    name: 'Enable Maintenance Mode',
                    type: 'command',
                    instruction: 'Put system in maintenance mode',
                    command: 'redis-cli set system_maintenance "{\\"enabled\\": true, \\"timestamp\\": $(date +%s)}"',
                    timeout: 10000,
                    retries: 2,
                    onFailure: 'continue',
                    evidence: true,
                },
                {
                    id: 'isolate_traffic',
                    name: 'Isolate External Traffic',
                    type: 'script',
                    instruction: 'Block external traffic at load balancer',
                    script: `#!/bin/bash
          # Update load balancer configuration
          curl -X POST "$LOAD_BALANCER_API/block-external" \\
               -H "Authorization: Bearer $LB_TOKEN" \\
               -d '{"action": "block_external", "reason": "security_incident"}'`,
                    timeout: 30000,
                    retries: 1,
                    onFailure: 'continue',
                    evidence: true,
                },
                {
                    id: 'collect_logs',
                    name: 'Collect Security Logs',
                    type: 'command',
                    instruction: 'Collect recent security logs',
                    command: 'find /var/log -name "*.log" -newer $(date -d "1 hour ago" "+%Y-%m-%d %H:%M:%S") -exec tail -100 {} \\;',
                    timeout: 60000,
                    retries: 1,
                    onFailure: 'continue',
                    evidence: true,
                },
                {
                    id: 'notify_team',
                    name: 'Notify Response Team',
                    type: 'http',
                    instruction: 'Send emergency notification',
                    url: '${SLACK_WEBHOOK_URL}',
                    method: 'POST',
                    body: {
                        text: 'EMERGENCY: System containment activated',
                        channel: '#incident-response',
                    },
                    timeout: 10000,
                    retries: 2,
                    onFailure: 'continue',
                },
            ],
            notifications: {
                onStart: ['security-team@company.com'],
                onSuccess: ['security-team@company.com', 'leadership@company.com'],
                onFailure: ['security-team@company.com', 'ciso@company.com'],
                onEscalation: ['ciso@company.com', 'ceo@company.com'],
            },
        });
        // Service recovery runbook
        this.registerRunbook({
            id: 'service_recovery',
            name: 'Service Recovery and Validation',
            description: 'Standard procedure for recovering failed services',
            category: 'recovery',
            severity: 'high',
            estimatedDuration: 30,
            prerequisites: ['Service status assessment', 'Root cause analysis'],
            approvalRequired: true,
            emergencyBypass: false,
            steps: [
                {
                    id: 'check_dependencies',
                    name: 'Verify Dependencies',
                    type: 'validation',
                    instruction: 'context.neo4j_healthy && context.redis_healthy && context.postgres_healthy',
                    timeout: 30000,
                    retries: 1,
                    onFailure: 'abort',
                },
                {
                    id: 'restart_service',
                    name: 'Restart Service',
                    type: 'command',
                    instruction: 'Restart the failed service',
                    command: 'docker compose restart ${SERVICE_NAME}',
                    timeout: 120000,
                    retries: 2,
                    onFailure: 'escalate',
                },
                {
                    id: 'validate_health',
                    name: 'Validate Service Health',
                    type: 'http',
                    instruction: 'Check service health endpoint',
                    url: 'http://${SERVICE_NAME}:${SERVICE_PORT}/health',
                    method: 'GET',
                    timeout: 30000,
                    retries: 3,
                    onFailure: 'escalate',
                },
                {
                    id: 'run_smoke_tests',
                    name: 'Execute Smoke Tests',
                    type: 'script',
                    instruction: 'Run basic functionality tests',
                    script: 'npm run test:smoke',
                    timeout: 300000,
                    retries: 1,
                    onFailure: 'escalate',
                },
            ],
            notifications: {
                onStart: ['devops-team@company.com'],
                onSuccess: ['devops-team@company.com'],
                onFailure: ['devops-team@company.com', 'engineering-leads@company.com'],
                onEscalation: ['engineering-director@company.com'],
            },
        });
    }
    /**
     * Register new runbook
     */
    registerRunbook(runbook) {
        this.runbooks.set(runbook.id, runbook);
    }
    /**
     * Get runbook execution status
     */
    getExecution(executionId) {
        return this.executions.get(executionId);
    }
    /**
     * List available runbooks
     */
    getRunbooks() {
        return Array.from(this.runbooks.values());
    }
    /**
     * Pause running execution
     */
    pauseExecution(executionId) {
        const execution = this.executions.get(executionId);
        if (execution && execution.status === 'running') {
            execution.status = 'paused';
            this.addLog(execution, 'info', 'Execution paused');
        }
    }
    /**
     * Abort running execution
     */
    abortExecution(executionId) {
        const execution = this.executions.get(executionId);
        if (execution &&
            (execution.status === 'running' || execution.status === 'paused')) {
            execution.status = 'aborted';
            execution.endTime = Date.now();
            this.addLog(execution, 'warn', 'Execution aborted');
        }
    }
    interpolateTemplate(template, context) {
        return template.replace(/\$\{([^}]+)\}/g, (match, key) => {
            const value = context[key] || process.env[key];
            return value !== undefined ? value.toString() : match;
        });
    }
    addLog(execution, level, message, data) {
        execution.logs.push({
            timestamp: Date.now(),
            level,
            message,
            data,
        });
    }
    async sendNotifications(recipients, execution, runbook) {
        // Implement notification sending logic
        console.log(`Sending notifications to: ${recipients.join(', ')}`);
    }
    async escalateRunbook(execution, runbook, failedStep) {
        execution.status = 'failed';
        execution.endTime = Date.now();
        this.addLog(execution, 'error', `Runbook escalated due to step failure: ${failedStep.name}`);
        await this.sendNotifications(runbook.notifications.onEscalation, execution, runbook);
        this.emit('runbook:escalated', execution);
    }
}
exports.RunbookExecutor = RunbookExecutor;
// Singleton instance
exports.runbookExecutor = new RunbookExecutor();
