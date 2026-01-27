/**
 * Maestro Orchestration Engine
 * Core DAG execution engine with retry, compensation, and state persistence
 */
import { EventEmitter } from 'events';
export class MaestroEngine extends EventEmitter {
    stateStore;
    artifactStore;
    policyEngine;
    plugins = new Map();
    activeRuns = new Map();
    constructor(stateStore, artifactStore, policyEngine) {
        super();
        this.stateStore = stateStore;
        this.artifactStore = artifactStore;
        this.policyEngine = policyEngine;
    }
    registerPlugin(plugin) {
        this.plugins.set(plugin.name, plugin);
        this.emit('plugin:registered', { name: plugin.name });
    }
    async startRun(context) {
        // Validate workflow definition
        this.validateWorkflow(context.workflow);
        // Check policy permissions
        const permitted = await this.policyEngine.check('workflow:execute', context.tenant_id, {
            workflow: context.workflow.name,
            environment: context.environment,
            budget: context.budget,
        });
        if (!permitted.allowed) {
            throw new Error(`Policy denied: ${permitted.reason}`);
        }
        // Initialize run state
        await this.stateStore.createRun(context);
        this.activeRuns.set(context.run_id, context);
        // Initialize all steps as pending
        for (const step of context.workflow.steps) {
            await this.stateStore.createStepExecution({
                step_id: step.id,
                run_id: context.run_id,
                status: 'pending',
                attempt: 0,
                metadata: {},
            });
        }
        this.emit('run:started', { run_id: context.run_id });
        // Start execution (async)
        setImmediate(() => this.executeWorkflow(context));
        return context.run_id;
    }
    async executeWorkflow(context) {
        try {
            const steps = this.topologicalSort(context.workflow.steps);
            for (const step of steps) {
                // Check if dependencies are satisfied
                const ready = await this.areDepenciesSatisfied(context.run_id, step);
                if (!ready) {
                    continue; // Will be picked up in next iteration
                }
                // Execute step with retry logic
                await this.executeStepWithRetry(context, step);
                // Check if run should continue
                const runStatus = await this.stateStore.getRunStatus(context.run_id);
                if (runStatus === 'cancelled' || runStatus === 'failed') {
                    break;
                }
            }
            await this.completeRun(context);
        }
        catch (error) {
            await this.handleRunFailure(context, error);
        }
    }
    async executeStepWithRetry(context, step) {
        const plugin = this.plugins.get(step.plugin);
        if (!plugin) {
            throw new Error(`Plugin not found: ${step.plugin}`);
        }
        const maxAttempts = step.retry?.max_attempts ?? 1;
        let attempt = 1;
        while (attempt <= maxAttempts) {
            const execution = {
                step_id: step.id,
                run_id: context.run_id,
                status: 'running',
                attempt,
                started_at: new Date(),
                metadata: {},
            };
            await this.stateStore.updateStepExecution(execution);
            try {
                // Execute with timeout
                const timeoutMs = step.timeout_ms ?? 300000; // 5 minutes default
                const result = await Promise.race([
                    plugin.execute(context, step, execution),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Step timeout')), timeoutMs)),
                ]);
                // Success
                execution.status = 'succeeded';
                execution.completed_at = new Date();
                execution.output = result.output;
                execution.cost_usd = result.cost_usd;
                execution.metadata = { ...execution.metadata, ...result.metadata };
                await this.stateStore.updateStepExecution(execution);
                this.emit('step:completed', {
                    run_id: context.run_id,
                    step_id: step.id,
                });
                return;
            }
            catch (error) {
                // Failure
                execution.status = 'failed';
                execution.completed_at = new Date();
                execution.error = error.message;
                await this.stateStore.updateStepExecution(execution);
                if (attempt === maxAttempts) {
                    // Final attempt failed
                    this.emit('step:failed', {
                        run_id: context.run_id,
                        step_id: step.id,
                        error: execution.error,
                    });
                    // Execute compensation if defined
                    if (step.compensation) {
                        await this.executeCompensation(context, step, execution);
                    }
                    throw error;
                }
                // Retry with backoff
                const backoffMs = step.retry?.backoff_ms ?? 1000;
                const delay = step.retry?.exponential
                    ? backoffMs * Math.pow(2, attempt - 1)
                    : backoffMs;
                await new Promise((resolve) => setTimeout(resolve, delay));
                attempt++;
            }
        }
    }
    async executeCompensation(context, step, execution) {
        if (!step.compensation)
            return;
        const plugin = this.plugins.get(step.compensation.plugin);
        if (!plugin || !plugin.compensate)
            return;
        try {
            await plugin.compensate(context, step, execution);
            this.emit('step:compensated', {
                run_id: context.run_id,
                step_id: step.id,
            });
        }
        catch (error) {
            this.emit('step:compensation_failed', {
                run_id: context.run_id,
                step_id: step.id,
                error: error.message,
            });
        }
    }
    topologicalSort(steps) {
        const visited = new Set();
        const visiting = new Set();
        const result = [];
        const stepMap = new Map(steps.map((s) => [s.id, s]));
        function visit(stepId) {
            if (visited.has(stepId))
                return;
            if (visiting.has(stepId)) {
                throw new Error(`Circular dependency detected: ${stepId}`);
            }
            visiting.add(stepId);
            const step = stepMap.get(stepId);
            if (step?.depends_on) {
                for (const dep of step.depends_on) {
                    visit(dep);
                }
            }
            visiting.delete(stepId);
            visited.add(stepId);
            if (step) {
                result.push(step);
            }
        }
        for (const step of steps) {
            visit(step.id);
        }
        return result;
    }
    validateWorkflow(workflow) {
        if (!workflow.name || !workflow.version || !workflow.steps) {
            throw new Error('Invalid workflow definition');
        }
        const stepIds = new Set(workflow.steps.map((s) => s.id));
        for (const step of workflow.steps) {
            // Validate plugin exists
            if (!this.plugins.has(step.plugin)) {
                throw new Error(`Unknown plugin: ${step.plugin}`);
            }
            // Validate dependencies exist
            if (step.depends_on) {
                for (const dep of step.depends_on) {
                    if (!stepIds.has(dep)) {
                        throw new Error(`Unknown dependency: ${dep} for step ${step.id}`);
                    }
                }
            }
            // Validate step config
            const plugin = this.plugins.get(step.plugin);
            plugin.validate(step.config);
        }
    }
    async areDepenciesSatisfied(runId, step) {
        if (!step.depends_on || step.depends_on.length === 0) {
            return true;
        }
        for (const depId of step.depends_on) {
            const execution = await this.stateStore.getStepExecution(runId, depId);
            if (!execution || execution.status !== 'succeeded') {
                return false;
            }
        }
        return true;
    }
    async completeRun(context) {
        await this.stateStore.updateRunStatus(context.run_id, 'completed');
        this.activeRuns.delete(context.run_id);
        this.emit('run:completed', { run_id: context.run_id });
    }
    async handleRunFailure(context, error) {
        await this.stateStore.updateRunStatus(context.run_id, 'failed', error.message);
        this.activeRuns.delete(context.run_id);
        this.emit('run:failed', { run_id: context.run_id, error: error.message });
    }
    async cancelRun(runId) {
        await this.stateStore.updateRunStatus(runId, 'cancelled');
        this.activeRuns.delete(runId);
        this.emit('run:cancelled', { run_id: runId });
    }
    async getRunStatus(runId) {
        return await this.stateStore.getRunDetails(runId);
    }
}
//# sourceMappingURL=engine.js.map