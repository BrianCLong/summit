"use strict";
/**
 * Maestro Orchestration Engine
 * Core DAG execution engine with retry, compensation, and state persistence
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaestroEngine = void 0;
const events_1 = require("events");
const fork_detector_1 = require("./fork_detector");
class MaestroEngine extends events_1.EventEmitter {
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
        this.emit("plugin:registered", { name: plugin.name });
    }
    async recover() {
        const activeExecutions = await this.stateStore.getActiveExecutions();
        const runIds = [...new Set(activeExecutions.map((e) => e.run_id))];
        for (const runId of runIds) {
            const runDetails = await this.stateStore.getRunDetails(runId);
            if (!runDetails || !runDetails.workflow_definition)
                continue;
            const context = {
                run_id: runDetails.run_id,
                workflow: runDetails.workflow_definition,
                tenant_id: runDetails.tenant_id,
                triggered_by: runDetails.triggered_by,
                environment: runDetails.environment,
                parameters: runDetails.parameters,
                budget: runDetails.budget,
            };
            this.activeRuns.set(runId, context);
            setImmediate(() => this.executeWorkflow(context));
        }
    }
    async startRun(context) {
        this.validateWorkflow(context.workflow);
        const permitted = await this.policyEngine.check("workflow:execute", context.tenant_id, {
            workflow: context.workflow.name,
            environment: context.environment,
            budget: context.budget,
        });
        if (!permitted.allowed) {
            throw new Error(`Policy denied: ${permitted.reason}`);
        }
        await this.stateStore.createRun(context);
        this.activeRuns.set(context.run_id, context);
        for (const step of context.workflow.steps) {
            await this.stateStore.createStepExecution({
                step_id: step.id,
                run_id: context.run_id,
                status: "pending",
                attempt: 0,
                metadata: {},
            });
        }
        this.emit("run:started", { run_id: context.run_id });
        setImmediate(() => this.executeWorkflow(context));
        return context.run_id;
    }
    async executeWorkflow(context) {
        try {
            if (context.workflow.schedule_policy === "fork_first") {
                await this.executeWorkflowForkFirst(context);
            }
            else {
                const steps = this.topologicalSort(context.workflow.steps);
                for (const step of steps) {
                    const ready = await this.areDepenciesSatisfied(context.run_id, step);
                    if (!ready)
                        continue;
                    await this.executeStepWithRetry(context, step);
                    const runStatus = await this.stateStore.getRunStatus(context.run_id);
                    if (runStatus === "cancelled" || runStatus === "failed")
                        break;
                }
                await this.completeRun(context);
            }
        }
        catch (error) {
            await this.handleRunFailure(context, error);
        }
    }
    async executeWorkflowForkFirst(context) {
        const remainingSteps = new Set(context.workflow.steps.map((s) => s.id));
        const stepMap = new Map(context.workflow.steps.map((s) => [s.id, s]));
        while (remainingSteps.size > 0) {
            const readySteps = [];
            for (const stepId of remainingSteps) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const step = stepMap.get(stepId);
                if (await this.areDepenciesSatisfied(context.run_id, step))
                    readySteps.push(step);
            }
            if (readySteps.length === 0)
                throw new Error("Deadlock detected: steps remaining but none ready.");
            const prioritized = fork_detector_1.ForkDetector.prioritize(readySteps);
            const nextStep = prioritized[0];
            await this.executeStepWithRetry(context, nextStep);
            remainingSteps.delete(nextStep.id);
            const runStatus = await this.stateStore.getRunStatus(context.run_id);
            if (runStatus === "cancelled" || runStatus === "failed")
                break;
        }
        const finalStatus = await this.stateStore.getRunStatus(context.run_id);
        if (finalStatus !== "failed" && finalStatus !== "cancelled")
            await this.completeRun(context);
    }
    async executeStepWithRetry(context, step) {
        const existing = await this.stateStore.getStepExecution(context.run_id, step.id);
        if (existing?.status === "succeeded")
            return;
        const plugin = this.plugins.get(step.plugin);
        if (!plugin)
            throw new Error(`Plugin not found: ${step.plugin}`);
        const maxAttempts = step.retry?.max_attempts ?? 1;
        let attempt = 1;
        while (attempt <= maxAttempts) {
            const execution = {
                step_id: step.id,
                run_id: context.run_id,
                status: "running",
                attempt,
                started_at: new Date(),
                metadata: {},
            };
            await this.stateStore.updateStepExecution(execution);
            try {
                const timeoutMs = step.timeout_ms ?? 300000;
                const result = await Promise.race([
                    plugin.execute(context, step, execution),
                    new Promise((_, reject) => setTimeout(() => reject(new Error("Step timeout")), timeoutMs)),
                ]);
                execution.status = "succeeded";
                execution.completed_at = new Date();
                execution.output = result.output;
                execution.cost_usd = result.cost_usd;
                execution.metadata = { ...execution.metadata, ...result.metadata };
                await this.stateStore.updateStepExecution(execution);
                this.emit("step:completed", { run_id: context.run_id, step_id: step.id });
                return;
            }
            catch (error) {
                execution.status = "failed";
                execution.completed_at = new Date();
                execution.error = error.message;
                await this.stateStore.updateStepExecution(execution);
                if (attempt === maxAttempts) {
                    this.emit("step:failed", { run_id: context.run_id, step_id: step.id, error: execution.error });
                    if (step.compensation)
                        await this.executeCompensation(context, step, execution);
                    throw error;
                }
                const backoffMs = step.retry?.backoff_ms ?? 1000;
                const delay = step.retry?.exponential ? backoffMs * Math.pow(2, attempt - 1) : backoffMs;
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
            this.emit("step:compensated", { run_id: context.run_id, step_id: step.id });
        }
        catch (error) {
            this.emit("step:compensation_failed", { run_id: context.run_id, step_id: step.id, error: error.message });
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
            if (visiting.has(stepId))
                throw new Error(`Circular dependency detected: ${stepId}`);
            visiting.add(stepId);
            const step = stepMap.get(stepId);
            if (step?.depends_on) {
                for (const dep of step.depends_on)
                    visit(dep);
            }
            visiting.delete(stepId);
            visited.add(stepId);
            if (step)
                result.push(step);
        }
        for (const step of steps)
            visit(step.id);
        return result;
    }
    validateWorkflow(workflow) {
        if (!workflow.name || !workflow.version || !workflow.steps)
            throw new Error("Invalid workflow definition");
        const stepIds = new Set(workflow.steps.map((s) => s.id));
        for (const step of workflow.steps) {
            if (!this.plugins.has(step.plugin))
                throw new Error(`Unknown plugin: ${step.plugin}`);
            if (step.depends_on) {
                for (const dep of step.depends_on) {
                    if (!stepIds.has(dep))
                        throw new Error(`Unknown dependency: ${dep} for step ${step.id}`);
                }
            }
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const plugin = this.plugins.get(step.plugin);
            plugin.validate(step.config);
        }
    }
    async areDepenciesSatisfied(runId, step) {
        if (!step.depends_on || step.depends_on.length === 0)
            return true;
        for (const depId of step.depends_on) {
            const execution = await this.stateStore.getStepExecution(runId, depId);
            if (!execution || execution.status !== "succeeded")
                return false;
        }
        return true;
    }
    async completeRun(context) {
        await this.stateStore.updateRunStatus(context.run_id, "completed");
        this.activeRuns.delete(context.run_id);
        this.emit("run:completed", { run_id: context.run_id });
    }
    async handleRunFailure(context, error) {
        await this.stateStore.updateRunStatus(context.run_id, "failed", error.message);
        this.activeRuns.delete(context.run_id);
        this.emit("run:failed", { run_id: context.run_id, error: error.message });
    }
    async cancelRun(runId) {
        await this.stateStore.updateRunStatus(runId, "cancelled");
        this.activeRuns.delete(runId);
        this.emit("run:cancelled", { run_id: runId });
    }
    // eslint-disable-next-line require-await
    async getRunStatus(runId) {
        return this.stateStore.getRunDetails(runId);
    }
}
exports.MaestroEngine = MaestroEngine;
