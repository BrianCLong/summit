"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationService = void 0;
const EnforcementService_js_1 = require("./EnforcementService.js");
const PolicyCompiler_js_1 = require("./PolicyCompiler.js");
class SimulationService {
    enforcementService;
    constructor() {
        this.enforcementService = EnforcementService_js_1.EnforcementService.getInstance();
    }
    /**
     * Run a simulation of a policy against a set of historical events.
     * @param policy The policy to test
     * @param events List of historical events (mapped to RuntimeContext)
     */
    async simulate(policy, events) {
        const compiler = PolicyCompiler_js_1.PolicyCompiler.getInstance();
        const plan = compiler.compile(policy);
        const result = {
            totalEvents: 0,
            allowed: 0,
            denied: 0,
            denialsByReason: {},
            details: []
        };
        for (const event of events) {
            result.totalEvents++;
            let decision;
            // Delegate to enforcement service using the compiled plan
            switch (event.context.action.type) {
                case 'query':
                    decision = this.enforcementService.evaluateQuery(event.context, plan);
                    break;
                case 'export':
                    decision = this.enforcementService.evaluateExport(event.context, plan);
                    break;
                case 'runbook':
                    decision = this.enforcementService.evaluateRunbookStep(event.context, plan);
                    break;
                default:
                    decision = { allowed: true, decisionId: 'sim-unknown' }; // Should not happen if types are correct
            }
            if (decision.allowed)
                result.allowed++;
            else {
                result.denied++;
                if (decision.reason) {
                    const code = decision.reason.code;
                    result.denialsByReason[code] = (result.denialsByReason[code] || 0) + 1;
                }
            }
            const isMatch = decision.allowed === event.originalOutcome;
            let diff = 'MATCH';
            if (!isMatch) {
                if (decision.allowed)
                    diff = 'NEW_ALLOW';
                else
                    diff = 'NEW_DENIAL';
            }
            result.details.push({
                eventId: event.id,
                originalDecision: event.originalOutcome,
                simulatedDecision: decision.allowed,
                diff,
                reason: decision.reason?.humanMessage
            });
        }
        return result;
    }
}
exports.SimulationService = SimulationService;
