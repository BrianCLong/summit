import type { AdapterEvaluation, PolicyAdapter, ReadonlyQueryContext } from '../types.js';

export abstract class BasePolicyAdapter implements PolicyAdapter {
  abstract readonly name: string;
  protected abstract shouldApply(context: ReadonlyQueryContext): Promise<boolean> | boolean;
  protected abstract apply(context: ReadonlyQueryContext): Promise<AdapterEvaluation> | AdapterEvaluation;

  async evaluate(context: ReadonlyQueryContext): Promise<AdapterEvaluation | null> {
    const applies = await this.shouldApply(context);
    if (!applies) {
      return null;
    }
    return this.apply(context);
  }
}
