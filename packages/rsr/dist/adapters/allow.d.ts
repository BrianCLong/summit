import { BasePolicyAdapter } from './base.js';
import type { AdapterEvaluation, ReadonlyQueryContext } from '../types.js';
export declare class AllowAdapter extends BasePolicyAdapter {
    readonly name = "allow";
    protected shouldApply(): boolean;
    protected apply(context: ReadonlyQueryContext): AdapterEvaluation;
}
export default AllowAdapter;
//# sourceMappingURL=allow.d.ts.map