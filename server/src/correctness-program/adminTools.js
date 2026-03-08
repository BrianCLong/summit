"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminRepairService = void 0;
const types_js_1 = require("./types.js");
class AdminRepairService {
    actions = [];
    queueAction(action) {
        const approvalRequired = action.risk === 'high' || action.risk === 'medium';
        const entry = { ...action, id: (0, types_js_1.newIdentifier)(), approvalRequired };
        this.actions.push(entry);
        return entry;
    }
    approve(actionId, approver) {
        const action = this.actions.find((a) => a.id === actionId);
        if (!action)
            throw new Error('Action not found');
        action.approvedBy = approver;
        return action;
    }
    execute(actionId, executor) {
        const action = this.actions.find((a) => a.id === actionId);
        if (!action)
            throw new Error('Action not found');
        if (action.approvalRequired && !action.approvedBy)
            throw new Error('Approval required');
        action.executedBy = executor;
        action.executedAt = new Date();
        return action;
    }
    list() {
        return [...this.actions];
    }
}
exports.AdminRepairService = AdminRepairService;
