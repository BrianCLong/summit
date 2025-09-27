import { BasePolicyAdapter } from './base.js';
import type { AdapterEvaluation, ReadonlyQueryContext } from '../types.js';
export interface KAnonymityFilterOptions {
    k: number;
    fallbackSelector?: string;
}
export declare class KAnonymityFilterAdapter extends BasePolicyAdapter {
    readonly name = "k-anonymity-filter";
    private readonly k;
    private readonly fallbackSelector?;
    constructor(options: KAnonymityFilterOptions);
    protected shouldApply(context: ReadonlyQueryContext): boolean;
    protected apply(context: ReadonlyQueryContext): AdapterEvaluation;
}
export default KAnonymityFilterAdapter;
//# sourceMappingURL=kAnonymityFilter.d.ts.map