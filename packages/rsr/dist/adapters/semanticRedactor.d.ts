import { BasePolicyAdapter } from './base.js';
import type { AdapterEvaluation, ReadonlyQueryContext } from '../types.js';
export interface SemanticRedactorOptions {
    embeddingThreshold?: number;
    sensitiveTokens?: string[];
}
export declare class SemanticPIIRedactorAdapter extends BasePolicyAdapter {
    readonly name = "semantic-pii-redactor";
    private readonly threshold;
    private readonly sensitiveTokens;
    constructor(options?: SemanticRedactorOptions);
    protected shouldApply(context: ReadonlyQueryContext): boolean;
    protected apply(context: ReadonlyQueryContext): AdapterEvaluation;
    private detectPattern;
    private embeddingScore;
}
export default SemanticPIIRedactorAdapter;
//# sourceMappingURL=semanticRedactor.d.ts.map