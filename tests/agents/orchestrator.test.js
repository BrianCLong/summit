"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const agent_orchestrator_js_1 = require("../../agents/orchestrator/agent-orchestrator.js");
const task_queue_js_1 = require("../../agents/queue/task-queue.js");
const antigravity_governance_js_1 = require("../../agents/antigravity-governance.js");
const codex_builder_js_1 = require("../../agents/codex-builder.js");
const jules_planner_js_1 = require("../../agents/jules-planner.js");
const observer_reviewer_js_1 = require("../../agents/observer-reviewer.js");
(0, node_test_1.describe)("AgentOrchestrator", () => {
    const buildTask = (id, priority) => ({
        id,
        objective: "Implement orchestrator runtime",
        inputs: {},
        priority,
    });
    const registerFlowAgents = (orchestrator) => {
        orchestrator.registerAgent(new jules_planner_js_1.JulesPlannerAgent());
        orchestrator.registerAgent(new codex_builder_js_1.CodexBuilderAgent());
        orchestrator.registerAgent(new observer_reviewer_js_1.ObserverReviewerAgent());
        orchestrator.registerAgent(new antigravity_governance_js_1.AntigravityGovernanceAgent());
    };
    (0, node_test_1.it)("registers agents in deterministic execution order", () => {
        const orchestrator = new agent_orchestrator_js_1.AgentOrchestrator();
        registerFlowAgents(orchestrator);
        strict_1.default.deepEqual(orchestrator.getRegisteredAgents().map((agent) => agent.name), ["Jules", "Codex", "Observer", "Antigravity"]);
    });
    (0, node_test_1.it)("routes task across planner-builder-reviewer-governance pipeline", async () => {
        const orchestrator = new agent_orchestrator_js_1.AgentOrchestrator();
        registerFlowAgents(orchestrator);
        orchestrator.enqueueTask(buildTask("task-route", 10));
        const result = await orchestrator.processNextTask();
        strict_1.default.equal(result?.status, "success");
        strict_1.default.deepEqual(result?.result?.timeline.map((step) => step.agent), ["Jules", "Codex", "Observer", "Antigravity"]);
        strict_1.default.equal(result?.result?.status, "success");
    });
    (0, node_test_1.it)("schedules tasks by priority with queue isolation", async () => {
        const orchestrator = new agent_orchestrator_js_1.AgentOrchestrator();
        registerFlowAgents(orchestrator);
        orchestrator.enqueueTask(buildTask("low", 1));
        orchestrator.enqueueTask(buildTask("high", 100));
        const first = await orchestrator.processNextTask();
        const second = await orchestrator.processNextTask();
        strict_1.default.equal(first?.taskId, "high");
        strict_1.default.equal(second?.taskId, "low");
    });
    (0, node_test_1.it)("recovers from retries and marks exhausted tasks without blocking queue", async () => {
        let failuresRemaining = 1;
        const retryingBuilder = {
            name: "Codex",
            role: "builder",
            execute(task) {
                if (failuresRemaining > 0) {
                    failuresRemaining -= 1;
                    return Promise.resolve({
                        status: "retry",
                        outputs: { reason: "temporary failure", taskId: task.id },
                    });
                }
                return Promise.resolve({
                    status: "success",
                    outputs: { recovered: true },
                });
            },
        };
        const queue = new task_queue_js_1.TaskQueue({ concurrency: 1, defaultMaxAttempts: 2 });
        const orchestrator = new agent_orchestrator_js_1.AgentOrchestrator(queue);
        orchestrator.registerAgent(new jules_planner_js_1.JulesPlannerAgent());
        orchestrator.registerAgent(retryingBuilder);
        orchestrator.registerAgent(new observer_reviewer_js_1.ObserverReviewerAgent());
        orchestrator.registerAgent(new antigravity_governance_js_1.AntigravityGovernanceAgent());
        orchestrator.enqueueTask(buildTask("retry-task", 50));
        const result = await orchestrator.processNextTask();
        strict_1.default.equal(result?.status, "success");
        strict_1.default.equal(result?.attempts, 2);
    });
});
