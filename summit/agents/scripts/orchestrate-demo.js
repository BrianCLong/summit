"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const agent_orchestrator_js_1 = require("../orchestrator/agent-orchestrator.js");
const event_log_js_1 = require("../logging/event-log.js");
const demoAgent = {
    name: 'demo-agent',
    canHandle: () => true,
    async execute(task) {
        return {
            task_id: task.id,
            status: 'success',
            outputs: { echoed: task.inputs },
            attempt: 1,
            started_at: new Date().toISOString(),
            finished_at: new Date().toISOString(),
        };
    },
};
const tasks = [
    {
        id: 'demo-1',
        priority: 10,
        created_at: new Date().toISOString(),
        type: 'demo',
        inputs: { message: 'summit orchestrator demo' },
    },
];
const run = async () => {
    const orchestrator = new agent_orchestrator_js_1.AgentOrchestrator([demoAgent], new event_log_js_1.EventLogWriter());
    const summary = await orchestrator.run(tasks);
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
};
void run();
