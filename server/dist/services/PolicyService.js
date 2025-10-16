import { evaluate } from './AccessControl.js';
import { writeAudit } from '../utils/audit.js';
export class PolicyError extends Error {
    code;
    reason;
    requiredClearances;
    appealPath;
    constructor(opts) {
        super(opts.reason);
        this.code = opts.code;
        this.reason = opts.reason;
        this.requiredClearances = opts.requiredClearances || [];
        this.appealPath = opts.appealPath;
    }
}
export function withPolicy(resolver, spec) {
    return (async (parent, args, context, info) => {
        const user = context.user || {};
        const resource = spec.getResource
            ? await spec.getResource(parent, args, context, info)
            : {};
        const decision = await evaluate(spec.action, user, resource, {});
        const requestId = context?.req?.id || context.requestId;
        const traceId = context?.traceId;
        await writeAudit({
            userId: user.id,
            action: spec.action,
            resourceType: info?.fieldName,
            resourceId: resource?.id,
            details: {
                decision: decision.allow ? 'allow' : 'deny',
                reason: decision.reason,
                requestId,
                traceId,
            },
        });
        context.reasonForAccess = spec.action;
        if (!decision.allow) {
            throw new PolicyError({
                code: 'POLICY_DENIED',
                reason: `Blocked: ${decision.reason || 'unauthorized'}`,
                requiredClearances: [],
                appealPath: '/appeal',
            });
        }
        return resolver(parent, args, context, info);
    });
}
//# sourceMappingURL=PolicyService.js.map