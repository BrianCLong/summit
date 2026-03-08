"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluate = evaluate;
const PolicyService_js_1 = require("./PolicyService.js");
async function evaluate(action, user, resource, env) {
    if (!user || !user.id) {
        return { allow: false, reason: 'Unauthenticated' };
    }
    const principal = {
        ...user,
        id: String(user.id),
        role: user.role ||
            user.roles?.[0] ||
            'USER',
        tenantId: user.tenantId ||
            resource?.tenantId,
    };
    const ctx = {
        principal,
        resource: resource || {},
        action,
        environment: {
            ...(env || {}),
        },
    };
    return PolicyService_js_1.policyService.evaluate(ctx);
}
