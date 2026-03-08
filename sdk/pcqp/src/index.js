"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPlanFromFile = loadPlanFromFile;
exports.parseFederatedPlan = parseFederatedPlan;
exports.policyGateSummary = policyGateSummary;
exports.getSubplansForSilo = getSubplansForSilo;
exports.complianceTimeline = complianceTimeline;
exports.findFirstPolicyEvent = findFirstPolicyEvent;
const promises_1 = require("node:fs/promises");
function assertValidPlan(value) {
    if (!value || typeof value !== 'object') {
        throw new Error('Plan payload must be an object');
    }
    const raw = value;
    if (!Array.isArray(raw.subplans)) {
        throw new Error('Plan must include an array of subplans');
    }
    if (typeof raw.coordinator !== 'object' || raw.coordinator === null) {
        throw new Error('Plan must include a coordinator block');
    }
    const compliance = raw.compliance;
    if (!compliance || !Array.isArray(compliance.events)) {
        throw new Error('Plan must include compliance events');
    }
}
function normalizePlan(raw) {
    return {
        subplans: raw.subplans.map((subplan) => ({
            silo: subplan.silo,
            sourceAlias: subplan.source_alias,
            dataset: subplan.dataset,
            pushedProjections: [...subplan.pushed_projections],
            pushedFilters: subplan.pushed_filters.map((filter) => ({
                table: filter.table,
                column: filter.column,
                op: filter.op,
                value: filter.value,
            })),
        })),
        coordinator: {
            joinStrategy: raw.coordinator.join_strategy ?? null,
            outputProjections: raw.coordinator.output_projections.map((projection) => ({
                table: projection.table,
                column: projection.column,
                alias: projection.alias ?? null,
            })),
        },
        compliance: {
            events: raw.compliance.events.map((event) => ({
                policyId: event.policy_id,
                silo: event.silo,
                message: event.message,
            })),
        },
    };
}
async function loadPlanFromFile(path) {
    const raw = await (0, promises_1.readFile)(path, 'utf-8');
    return parseFederatedPlan(raw);
}
function parseFederatedPlan(payload) {
    const rawValue = typeof payload === 'string' ? JSON.parse(payload) : payload;
    assertValidPlan(rawValue);
    return normalizePlan(rawValue);
}
function policyGateSummary(plan) {
    return plan.compliance.events.reduce((acc, event) => {
        const next = acc[event.policyId] ?? 0;
        acc[event.policyId] = next + 1;
        return acc;
    }, {});
}
function getSubplansForSilo(plan, silo) {
    return plan.subplans.filter((subplan) => subplan.silo === silo);
}
function complianceTimeline(plan) {
    return plan.compliance.events.map((event) => `${event.policyId} :: ${event.message}`);
}
function findFirstPolicyEvent(plan, policyId) {
    return plan.compliance.events.find((event) => event.policyId === policyId);
}
__exportStar(require("./types.js"), exports);
