"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sortTasksDeterministically = exports.AgentOrchestrator = void 0;
const node_crypto_1 = require("node:crypto");
const registry_js_1 = require("./uncertainty/registry.js");
const sensors_js_1 = require("./uncertainty/sensors.js");
const policy_engine_js_1 = require("./uncertainty/policy-engine.js");
const event_log_js_1 = require("../logging/event-log.js");
const hash_js_1 = require("../provenance/hash.js");
const sortTasksDeterministically = (tasks) => [...tasks].sort((left, right) => {
    if (right.priority !== left.priority) {
        return right.priority - left.priority;
    }
    const createdComparison = new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
    if (createdComparison !== 0) {
        return createdComparison;
    }
    return left.id.localeCompare(right.id);
});
exports.sortTasksDeterministically = sortTasksDeterministically;
class AgentOrchestrator {
    agents;
    eventLog;
    sensorRunner;
    constructor(agents, eventLog = new event_log_js_1.EventLogWriter(), sensorRunner = new sensors_js_1.UncertaintySensorRunner()) {
        this.agents = agents;
        this.eventLog = eventLog;
        this.sensorRunner = sensorRunner;
    }
    async run(tasks) {
        const run_id = (0, node_crypto_1.randomUUID)();
        const started_at = new Date().toISOString();
        const orderedTasks = sortTasksDeterministically(tasks);
        const results = [];
        this.emit({
            run_id,
            task_id: null,
            agent_name: null,
            ts: started_at,
            type: 'RUN_STARTED',
            inputs_hash: null,
            outputs_hash: null,
            attempt: null,
            status: 'started',
            metadata: { total_tasks: orderedTasks.length },
        });
        for (const task of orderedTasks) {
            const inputsHash = (0, hash_js_1.hashInputs)(task.inputs);
            this.emit({
                run_id,
                task_id: task.id,
                agent_name: null,
                ts: new Date().toISOString(),
                type: 'TASK_ENQUEUED',
                inputs_hash: inputsHash,
                outputs_hash: null,
                attempt: 1,
                status: 'started',
                metadata: { priority: task.priority, created_at: task.created_at },
            });
            this.emit({
                run_id,
                task_id: task.id,
                agent_name: null,
                ts: new Date().toISOString(),
                type: 'TASK_DEQUEUED',
                inputs_hash: inputsHash,
                outputs_hash: null,
                attempt: 1,
                status: 'started',
                metadata: {},
            });
            // --- UNCERTAINTY REPRESENTATION & IDENTIFICATION ---
            // Ensure we have a baseline record for this task
            const existingRecords = registry_js_1.globalRegistry.findByEntity(task.id);
            if (existingRecords.length === 0) {
                registry_js_1.globalRegistry.createRecord(task.id, {}, { source_agent: 'orchestrator' });
            }
            // --- UNCERTAINTY ADAPTATION (POLICY CHECK) ---
            const policyActions = policy_engine_js_1.globalPolicyEngine.evaluatePlan(task.metadata || {}, registry_js_1.globalRegistry.findByEntity(task.id));
            let shouldBlock = false;
            let policyAdaptationReason = '';
            for (const action of policyActions) {
                if (action.action_type === 'block_and_route') {
                    shouldBlock = true;
                    policyAdaptationReason = `Blocked by uncertainty policy: ${action.parameters.reason}`;
                }
                else if (action.action_type === 'add_step' || action.action_type === 'adjust_sampling') {
                    // We might adapt the task here if needed
                    console.log(`Adapting task ${task.id} due to policy action: ${action.action_type}`);
                }
            }
            if (shouldBlock) {
                this.emit({
                    run_id,
                    task_id: task.id,
                    agent_name: null,
                    ts: new Date().toISOString(),
                    type: 'TASK_FAILED',
                    inputs_hash: inputsHash,
                    outputs_hash: null,
                    attempt: 1,
                    status: 'failed',
                    metadata: { reason: policyAdaptationReason },
                });
                results.push({
                    task_id: task.id,
                    status: 'failed',
                    outputs: {},
                    error: policyAdaptationReason,
                    attempt: 1,
                    started_at: new Date().toISOString(),
                    finished_at: new Date().toISOString(),
                });
                continue;
            }
            const selectedAgent = this.agents.find((agent) => agent.canHandle(task));
            if (!selectedAgent) {
                this.emit({
                    run_id,
                    task_id: task.id,
                    agent_name: null,
                    ts: new Date().toISOString(),
                    type: 'TASK_FAILED',
                    inputs_hash: inputsHash,
                    outputs_hash: null,
                    attempt: 1,
                    status: 'failed',
                    metadata: { reason: 'No suitable agent found' },
                });
                results.push({
                    task_id: task.id,
                    status: 'failed',
                    outputs: {},
                    error: 'No suitable agent found',
                    attempt: 1,
                    started_at: new Date().toISOString(),
                    finished_at: new Date().toISOString(),
                });
                continue;
            }
            this.emit({
                run_id,
                task_id: task.id,
                agent_name: selectedAgent.name,
                ts: new Date().toISOString(),
                type: 'AGENT_SELECTED',
                inputs_hash: inputsHash,
                outputs_hash: null,
                attempt: 1,
                status: 'started',
                metadata: {},
            });
            const maxAttempts = Math.max(1, task.max_attempts ?? 1);
            let attempt = 1;
            let finalResult = null;
            while (attempt <= maxAttempts) {
                this.emit({
                    run_id,
                    task_id: task.id,
                    agent_name: selectedAgent.name,
                    ts: new Date().toISOString(),
                    type: 'AGENT_EXEC_STARTED',
                    inputs_hash: inputsHash,
                    outputs_hash: null,
                    attempt,
                    status: 'started',
                    metadata: {},
                });
                try {
                    const result = await selectedAgent.execute(task);
                    finalResult = { ...result, attempt };
                    this.emit({
                        run_id,
                        task_id: task.id,
                        agent_name: selectedAgent.name,
                        ts: new Date().toISOString(),
                        type: 'AGENT_EXEC_FINISHED',
                        inputs_hash: inputsHash,
                        outputs_hash: (0, hash_js_1.hashOutputs)(result.outputs),
                        attempt,
                        status: result.status,
                        metadata: {
                            error: result.error ?? null,
                        },
                    });
                    if (result.status === 'success') {
                        // Run sensors on output to identify any new uncertainty
                        this.sensorRunner.runAll(task.id, result.outputs, registry_js_1.globalRegistry);
                        break;
                    }
                    if (attempt < maxAttempts) {
                        this.emit({
                            run_id,
                            task_id: task.id,
                            agent_name: selectedAgent.name,
                            ts: new Date().toISOString(),
                            type: 'TASK_RETRIED',
                            inputs_hash: inputsHash,
                            outputs_hash: (0, hash_js_1.hashOutputs)(result.outputs),
                            attempt,
                            status: 'retrying',
                            metadata: {},
                        });
                    }
                }
                catch (error) {
                    const failureResult = {
                        task_id: task.id,
                        status: 'failed',
                        outputs: {},
                        error: error instanceof Error ? error.message : String(error),
                        attempt,
                        started_at: new Date().toISOString(),
                        finished_at: new Date().toISOString(),
                    };
                    finalResult = failureResult;
                    this.emit({
                        run_id,
                        task_id: task.id,
                        agent_name: selectedAgent.name,
                        ts: new Date().toISOString(),
                        type: 'AGENT_EXEC_FINISHED',
                        inputs_hash: inputsHash,
                        outputs_hash: (0, hash_js_1.hashOutputs)(failureResult.outputs),
                        attempt,
                        status: 'failed',
                        metadata: {
                            error: failureResult.error,
                        },
                    });
                    if (attempt < maxAttempts) {
                        this.emit({
                            run_id,
                            task_id: task.id,
                            agent_name: selectedAgent.name,
                            ts: new Date().toISOString(),
                            type: 'TASK_RETRIED',
                            inputs_hash: inputsHash,
                            outputs_hash: (0, hash_js_1.hashOutputs)(failureResult.outputs),
                            attempt,
                            status: 'retrying',
                            metadata: {
                                reason: 'Execution error',
                            },
                        });
                    }
                }
                attempt += 1;
            }
            if (!finalResult) {
                continue;
            }
            if (finalResult.status === 'failed') {
                this.emit({
                    run_id,
                    task_id: task.id,
                    agent_name: selectedAgent.name,
                    ts: new Date().toISOString(),
                    type: 'TASK_FAILED',
                    inputs_hash: inputsHash,
                    outputs_hash: (0, hash_js_1.hashOutputs)(finalResult.outputs),
                    attempt: finalResult.attempt,
                    status: 'failed',
                    metadata: {
                        error: finalResult.error ?? null,
                    },
                });
            }
            results.push(finalResult);
        }
        const finished_at = new Date().toISOString();
        this.emit({
            run_id,
            task_id: null,
            agent_name: null,
            ts: finished_at,
            type: 'RUN_FINISHED',
            inputs_hash: null,
            outputs_hash: null,
            attempt: null,
            status: 'finished',
            metadata: {
                succeeded_tasks: results.filter((result) => result.status === 'success').length,
                failed_tasks: results.filter((result) => result.status === 'failed').length,
            },
        });
        return {
            run_id,
            started_at,
            finished_at,
            total_tasks: orderedTasks.length,
            succeeded_tasks: results.filter((result) => result.status === 'success').length,
            failed_tasks: results.filter((result) => result.status === 'failed').length,
            results,
            events_emitted: this.eventLog.getEvents().length,
        };
    }
    getEvents() {
        return this.eventLog.getEvents();
    }
    emit(event) {
        this.eventLog.append(event);
    }
}
exports.AgentOrchestrator = AgentOrchestrator;
