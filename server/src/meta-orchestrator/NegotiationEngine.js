"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NegotiationEngine = void 0;
const types_js_1 = require("./types.js");
const GovernanceExtension_js_1 = require("./GovernanceExtension.js");
const crypto_1 = require("crypto");
class NegotiationEngine {
    negotiations = new Map();
    governance;
    constructor() {
        this.governance = new GovernanceExtension_js_1.GovernanceExtension();
    }
    async initiateNegotiation(initiatorId, participantIds, topic, context, tenantId) {
        const allowed = await this.governance.validateNegotiation(initiatorId, participantIds, topic);
        if (!allowed) {
            throw new Error('Negotiation blocked by governance policy');
        }
        const negotiation = {
            id: (0, crypto_1.randomUUID)(),
            initiatorId,
            participantIds,
            topic,
            status: types_js_1.NegotiationStatus.PENDING,
            rounds: [],
            context,
            tenantId,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.negotiations.set(negotiation.id, negotiation);
        return negotiation;
    }
    getNegotiation(id) {
        return this.negotiations.get(id);
    }
    getAllNegotiations(tenantId) {
        const all = Array.from(this.negotiations.values());
        if (tenantId) {
            return all.filter(n => n.tenantId === tenantId);
        }
        return all;
    }
    async submitProposal(negotiationId, agentId, content) {
        const negotiation = this.negotiations.get(negotiationId);
        if (!negotiation)
            throw new Error('Negotiation not found');
        if (negotiation.status === types_js_1.NegotiationStatus.COMPLETED || negotiation.status === types_js_1.NegotiationStatus.FAILED) {
            throw new Error('Negotiation is closed');
        }
        negotiation.status = types_js_1.NegotiationStatus.IN_PROGRESS;
        // Check governance for this specific proposal
        const allowed = await this.governance.validateAction(agentId, 'submit_proposal', { ...negotiation.context, content });
        if (!allowed) {
            throw new Error('Proposal blocked by governance');
        }
        // Find current round or create new one
        let currentRound = negotiation.rounds[negotiation.rounds.length - 1];
        if (!currentRound || currentRound.consensusReached) {
            currentRound = {
                id: (0, crypto_1.randomUUID)(),
                roundNumber: negotiation.rounds.length + 1,
                proposals: [],
                consensusReached: false
            };
            negotiation.rounds.push(currentRound);
        }
        const proposal = {
            id: (0, crypto_1.randomUUID)(),
            agentId,
            content,
            timestamp: new Date()
        };
        currentRound.proposals.push(proposal);
        negotiation.updatedAt = new Date();
        // Simple logic: if all participants have proposed, check for consensus (mock logic)
        // In a real system, an LLM or logic evaluator would check this.
        return negotiation;
    }
    resolveNegotiation(negotiationId, success, finalAgreement) {
        const negotiation = this.negotiations.get(negotiationId);
        if (!negotiation)
            throw new Error('Negotiation not found');
        negotiation.status = success ? types_js_1.NegotiationStatus.COMPLETED : types_js_1.NegotiationStatus.FAILED;
        negotiation.finalAgreement = finalAgreement;
        negotiation.updatedAt = new Date();
        return negotiation;
    }
}
exports.NegotiationEngine = NegotiationEngine;
