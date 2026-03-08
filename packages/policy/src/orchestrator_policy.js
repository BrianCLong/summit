"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestratorPolicy = void 0;
class OrchestratorPolicy {
    checkPermission(action, context) {
        // MWS implementation mimicking Rego
        if (action === 'start_task')
            return true;
        if (action === 'complete_task')
            return true;
        if (action === 'approve_join') {
            return context.user?.id === context.team?.leadAgentId;
        }
        return false;
    }
}
exports.OrchestratorPolicy = OrchestratorPolicy;
