"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateInvariants = evaluateInvariants;
async function evaluateInvariants(invariants, ctx) {
    const violations = [];
    for (const inv of invariants) {
        let holds = false;
        try {
            holds = await inv.check(ctx);
        }
        catch {
            holds = false;
        }
        if (!holds) {
            violations.push({
                invariantId: inv.id,
                description: inv.description,
                severity: inv.severity,
                timestamp: new Date().toISOString(),
                contextRef: ctx.resource,
            });
        }
    }
    const ok = !violations.some((v) => v.severity === "block");
    return { ok, violations };
}
