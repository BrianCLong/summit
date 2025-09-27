import { BasePolicyAdapter } from './base.js';
import type { AdapterEvaluation, ReadonlyQueryContext } from '../types.js';

export class AllowAdapter extends BasePolicyAdapter {
  readonly name = 'allow';

  protected shouldApply(): boolean {
    return true;
  }

  protected apply(context: ReadonlyQueryContext): AdapterEvaluation {
    return {
      action: 'allow',
      explanation: 'Query passed all governance checks.',
      sanitizedSelectors: [...context.selectors],
    };
  }
}

export default AllowAdapter;
