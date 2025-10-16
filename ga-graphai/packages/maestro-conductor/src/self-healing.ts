import type {
  ResponseStrategy,
  SelfHealingContext,
  SelfHealingPlan,
  SelfHealingResult,
} from './types';

export interface SelfHealingOrchestratorOptions {
  defaultCooldownMs?: number;
}

const DEFAULT_OPTIONS: Required<SelfHealingOrchestratorOptions> = {
  defaultCooldownMs: 5 * 60 * 1000,
};

export class SelfHealingOrchestrator {
  private readonly strategies = new Map<string, ResponseStrategy>();

  private readonly cooldowns = new Map<string, number>();

  private readonly options: Required<SelfHealingOrchestratorOptions>;

  constructor(options?: SelfHealingOrchestratorOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  registerStrategy(strategy: ResponseStrategy): void {
    this.strategies.set(strategy.id, strategy);
  }

  listStrategies(): ResponseStrategy[] {
    return [...this.strategies.values()];
  }

  async orchestrate(context: SelfHealingContext): Promise<{
    results: SelfHealingResult[];
    plans: SelfHealingPlan[];
  }> {
    const results: SelfHealingResult[] = [];
    const plans: SelfHealingPlan[] = [];

    for (const strategy of this.strategies.values()) {
      if (!strategy.supports(context.asset)) {
        continue;
      }
      if (!strategy.shouldTrigger(context)) {
        continue;
      }
      if (this.onCooldown(context.asset.id, strategy.id)) {
        continue;
      }
      const result = await strategy.execute(context);
      results.push(result);
      if (result.executed) {
        plans.push({
          strategyId: strategy.id,
          description: strategy.description,
          actions: result.actions,
        });
        this.startCooldown(context.asset.id, strategy.id, strategy.cooldownMs);
      }
    }

    return { results, plans };
  }

  private startCooldown(
    assetId: string,
    strategyId: string,
    override?: number,
  ): void {
    const key = `${assetId}:${strategyId}`;
    const duration = override ?? this.options.defaultCooldownMs;
    this.cooldowns.set(key, Date.now() + duration);
  }

  private onCooldown(assetId: string, strategyId: string): boolean {
    const key = `${assetId}:${strategyId}`;
    const until = this.cooldowns.get(key);
    if (!until) {
      return false;
    }
    if (Date.now() > until) {
      this.cooldowns.delete(key);
      return false;
    }
    return true;
  }
}
