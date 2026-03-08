"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPlan = runPlan;
const budgets_1 = require("./budgets");
async function runPlan(plan, budgets, policyCheck) {
    const usage = { agentsSpawned: 1, stepsExecuted: 0, toolCalls: 0, wallMs: 0 };
    const outputs = {};
    const startTime = Date.now();
    try {
        for (const t of plan.tasks) {
            usage.stepsExecuted += 1;
            if (policyCheck) {
                usage.toolCalls += 1;
                policyCheck("simulatedTool");
            }
            usage.wallMs = Date.now() - startTime;
            (0, budgets_1.assertWithinBudgets)(budgets, usage);
            outputs[t.taskId] = `Completed: ${t.description}`;
        }
        return { ok: true, usage, outputs };
    }
    catch (e) {
        return { ok: false, usage, outputs: { error: e.message } };
    }
}
