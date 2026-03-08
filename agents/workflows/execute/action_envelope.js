"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createActionProposal = createActionProposal;
function createActionProposal(command) {
    return {
        intent: 'execute',
        proposal: command,
        requires_approval: true,
        status: 'pending'
    };
}
