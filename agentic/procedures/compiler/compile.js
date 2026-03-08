"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileProcedure = compileProcedure;
exports.serializePlan = serializePlan;
const stableStringify_1 = require("../utils/stableStringify");
function sortObjectKeys(value) {
    return Object.keys(value)
        .sort((left, right) => left.localeCompare(right))
        .reduce((acc, key) => {
        acc[key] = value[key];
        return acc;
    }, {});
}
function compileProcedure(procedure) {
    const inputs = procedure.inputs ? sortObjectKeys(procedure.inputs) : {};
    return {
        id: procedure.id,
        version: procedure.version,
        source: {
            procedureId: procedure.id,
            procedureVersion: procedure.version,
        },
        inputs,
        steps: procedure.steps.map((step, index) => ({
            id: `step-${String(index + 1).padStart(2, '0')}`,
            name: step.name,
            type: step.type,
            with: step.with ? sortObjectKeys(step.with) : {},
        })),
    };
}
function serializePlan(plan) {
    return (0, stableStringify_1.stableStringify)(plan);
}
