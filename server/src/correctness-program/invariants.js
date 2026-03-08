"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildBooleanStateMachine = exports.InvariantRegistry = void 0;
const types_js_1 = require("./types.js");
class InvariantRegistry {
    invariants = new Map();
    stateMachines = new Map();
    idempotencyCache = new Map();
    violations = [];
    quarantinedRecords = new Map();
    registerInvariant(definition) {
        this.invariants.set(definition.id, definition);
    }
    registerStateMachine(machine) {
        if (!machine.states.includes(machine.initialState)) {
            throw new Error(`Initial state ${machine.initialState} not part of machine ${machine.id}`);
        }
        this.stateMachines.set(machine.id, machine);
    }
    getStateMachine(id) {
        return this.stateMachines.get(id);
    }
    validateStateTransition(machineId, from, to, payload) {
        const machine = this.stateMachines.get(machineId);
        if (!machine)
            throw new Error(`Unknown state machine ${machineId}`);
        const transition = machine.transitions.find((t) => t.from === from && t.to === to);
        if (!transition || !transition.allowed) {
            throw new Error(`Transition from ${from} to ${to} is not allowed for ${machineId}`);
        }
        if (transition.guard && !transition.guard(payload)) {
            throw new Error(`Guard prevented transition for ${machineId}`);
        }
        return true;
    }
    async validateWrite(domain, payload, idempotencyKey) {
        if (idempotencyKey && this.idempotencyCache.has(idempotencyKey)) {
            return { idempotent: true, violations: [] };
        }
        const violations = [];
        const invariantDefs = Array.from(this.invariants.values()).filter((i) => i.domain === domain);
        for (const invariant of invariantDefs) {
            const isValid = await invariant.validate(payload);
            if (!isValid) {
                const violation = {
                    id: (0, types_js_1.newIdentifier)(),
                    invariantId: invariant.id,
                    domain,
                    input: payload,
                    occurredAt: new Date(),
                    quarantined: invariant.severity === 'critical',
                    message: invariant.description,
                };
                violations.push(violation);
                this.violations.push(violation);
                if (violation.quarantined) {
                    this.quarantinedRecords.set(violation.id, payload);
                }
            }
        }
        if (idempotencyKey) {
            this.idempotencyCache.set(idempotencyKey, { payload, violations });
        }
        return { idempotent: false, violations };
    }
    guardBulkOperation(guardrail) {
        const diffPreview = guardrail.plannedChanges.map((change) => JSON.stringify(change));
        const approvalRequired = guardrail.plannedChanges.length > 10 || diffPreview.join('').length > 10_000;
        if (approvalRequired && !guardrail.approver) {
            throw new Error('High-risk bulk operations require an approver');
        }
        return {
            approvalRequired,
            approvedBy: guardrail.approver,
            dryRun: guardrail.dryRun,
            diffPreview,
        };
    }
    violationsByDomain(domain) {
        return this.violations.filter((v) => v.domain === domain);
    }
    getQuarantine() {
        return Array.from(this.quarantinedRecords.entries()).map(([id, record]) => ({ id, record }));
    }
}
exports.InvariantRegistry = InvariantRegistry;
const buildBooleanStateMachine = (id, domain, activeState, inactiveState) => ({
    id,
    domain,
    states: [activeState, inactiveState],
    transitions: [
        { from: inactiveState, to: activeState, allowed: true },
        { from: activeState, to: inactiveState, allowed: true },
    ],
    initialState: inactiveState,
});
exports.buildBooleanStateMachine = buildBooleanStateMachine;
