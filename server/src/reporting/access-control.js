"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccessControlService = void 0;
class AccessControlService {
    rules;
    constructor(rules) {
        this.rules = rules;
    }
    ensureAuthorized(context, resource, action) {
        const allowed = this.rules.some((rule) => rule.resource === resource &&
            rule.action === action &&
            rule.roles.some((role) => context.roles.includes(role)));
        if (!allowed) {
            throw new Error(`User ${context.userId} is not permitted to ${action} ${resource}`);
        }
    }
}
exports.AccessControlService = AccessControlService;
