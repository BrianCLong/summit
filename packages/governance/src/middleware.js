"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.governExecution = governExecution;
const invariants_1 = require("./invariants");
async function governExecution(invariants, ctx, record) {
    const { ok, violations } = await (0, invariants_1.evaluateInvariants)(invariants, ctx);
    const decision = ok
        ? { allowed: true, warnings: violations.filter((v) => v.severity === "warn") }
        : { allowed: false, violations };
    await record(decision, ctx);
    return decision;
}
