import { OpaClient } from './OpaClient.js';
export async function authorize(action, resource, auth) {
    const decision = await OpaClient.evaluate('intelgraph/tenant', { action, resource, auth });
    if (!decision.allow) {
        throw new Error(decision.deny_reason || 'unauthorized');
    }
}
//# sourceMappingURL=AuthorizationService.js.map