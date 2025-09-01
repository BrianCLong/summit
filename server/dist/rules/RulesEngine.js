export class RulesEngine {
    constructor(alerts) {
        this.alerts = alerts;
        this.lastFired = new Map();
    }
    async evalPattern(rule) {
        if (!rule.when.dryRun) {
            this.emit(rule, {});
        }
    }
    observeCounter(rule, value) {
        if (rule.when.threshold && value >= rule.when.threshold) {
            if (!rule.when.dryRun) {
                this.emit(rule, { value });
            }
        }
    }
    emit(rule, extra) {
        const now = Date.now();
        const dedupe = rule.when.dedupeKey;
        if (dedupe) {
            const last = this.lastFired.get(dedupe);
            if (last && rule.when.cooldownMs && now - last < rule.when.cooldownMs) {
                return;
            }
            this.lastFired.set(dedupe, now);
        }
        this.alerts.create({
            ruleId: rule.id,
            tenantId: 'tenant',
            severity: rule.severity,
            message: rule.then.message,
            at: new Date().toISOString(),
            dedupeKey: dedupe,
            meta: extra,
        });
    }
}
//# sourceMappingURL=RulesEngine.js.map