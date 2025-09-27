import type { AdapterEvaluation, PolicyAdapter, ReadonlyQueryContext } from '../types.js';
export declare abstract class BasePolicyAdapter implements PolicyAdapter {
    abstract readonly name: string;
    protected abstract shouldApply(context: ReadonlyQueryContext): Promise<boolean> | boolean;
    protected abstract apply(context: ReadonlyQueryContext): Promise<AdapterEvaluation> | AdapterEvaluation;
    evaluate(context: ReadonlyQueryContext): Promise<AdapterEvaluation | null>;
}
//# sourceMappingURL=base.d.ts.map