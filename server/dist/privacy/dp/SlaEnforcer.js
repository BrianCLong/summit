import { withinErrorBound } from './ErrorMonitor';
export class SlaEnforcer {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async check(observed, expectedVar, entId, orderId) {
        const { ok, bound } = withinErrorBound(observed, expectedVar);
        if (!ok) {
            await this.deps.orders.credit(orderId);
            await this.deps.entitlements.pause(entId);
            return { refunded: true, bound };
        }
        return { refunded: false, bound };
    }
}
//# sourceMappingURL=SlaEnforcer.js.map