"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = __importDefault(require("node:crypto"));
const agent_orchestrator_js_1 = require("../orchestrator/agent-orchestrator.js");
async function run() {
    const runId = node_crypto_1.default.randomUUID();
    const eventLog = [];
    const provenanceLog = [];
    const orchestrator = new agent_orchestrator_js_1.AgentOrchestrator({
        eventSink: (event) => eventLog.push(event),
        provenanceSink: (event) => provenanceLog.push(event),
    });
    orchestrator.registerSkill("tests.run", async () => ({ ok: true, suite: "unit" }));
    const allowedInvocation = {
        run_id: runId,
        task_id: "task-allowed",
        agent_name: "codex",
        agent_role: "builder",
        skill: "tests.run",
        inputs: { suite: "unit" },
        scope: { repo_paths: ["server/src/index.ts"] },
        env: "dev",
    };
    const deniedInvocation = {
        run_id: runId,
        task_id: "task-denied",
        agent_name: "codex",
        agent_role: "builder",
        skill: "release.approve",
        inputs: { tag: "v1.2.3" },
        scope: {},
        env: "dev",
    };
    const allowed = await orchestrator.invokeSkill(allowedInvocation);
    console.log("Allowed invocation result:", allowed);
    try {
        await orchestrator.invokeSkill(deniedInvocation);
    }
    catch (error) {
        console.log("Denied invocation error:", error.message);
    }
    console.log("Event log tail:");
    console.log(eventLog.slice(-6));
    console.log("Provenance log tail:");
    console.log(provenanceLog.slice(-6));
}
run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
