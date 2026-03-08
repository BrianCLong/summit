"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelfHealingOrchestrator = void 0;
const DEFAULT_OPTIONS = {
    defaultCooldownMs: 5 * 60 * 1000,
};
class SelfHealingOrchestrator {
    strategies = new Map();
    cooldowns = new Map();
    options;
    constructor(options) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }
    registerStrategy(strategy) {
        this.strategies.set(strategy.id, strategy);
    }
    listStrategies() {
        return [...this.strategies.values()];
    }
    async orchestrate(context) {
        const results = [];
        const plans = [];
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
    startCooldown(assetId, strategyId, override) {
        const key = `${assetId}:${strategyId}`;
        const duration = override ?? this.options.defaultCooldownMs;
        this.cooldowns.set(key, Date.now() + duration);
    }
    onCooldown(assetId, strategyId) {
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
exports.SelfHealingOrchestrator = SelfHealingOrchestrator;
