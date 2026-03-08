"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertWithinBudgets = assertWithinBudgets;
function assertWithinBudgets(b, u) {
    const errs = [];
    if (u.agentsSpawned > b.maxAgents) {
        errs.push("agents");
    }
    if (u.stepsExecuted > b.maxSteps) {
        errs.push("steps");
    }
    if (u.toolCalls > b.maxToolCalls) {
        errs.push("toolCalls");
    }
    if (u.wallMs > b.maxWallMs) {
        errs.push("wallMs");
    }
    if (errs.length > 0) {
        throw new Error(`budget_exceeded:${errs.join(",")}`);
    }
}
