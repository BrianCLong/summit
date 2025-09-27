import { PolicyAdapter, QueryContext, RoutingDecision } from './types.js';
export declare class RetrievalSafetyRouter {
    private readonly adapters;
    private readonly fallback?;
    constructor(adapters: PolicyAdapter[], fallback?: PolicyAdapter);
    route(context: QueryContext): Promise<RoutingDecision>;
}
export default RetrievalSafetyRouter;
//# sourceMappingURL=router.d.ts.map