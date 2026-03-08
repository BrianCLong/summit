"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertingEngine = void 0;
class AlertingEngine {
    rules = new Map(); // tenantId -> rules
    constructor() {
        // Initialize with some default rules
        this.addRule('default', {
            id: 'rule-high-velocity',
            name: 'High Event Velocity',
            condition: 'gt',
            metric: 'velocity',
            threshold: 100, // 100 events per minute
            severity: 'high',
            enabled: true,
        });
    }
    addRule(tenantId, rule) {
        const tenantRules = this.rules.get(tenantId) || [];
        tenantRules.push(rule);
        this.rules.set(tenantId, tenantRules);
    }
    checkAlerts(context) {
        const triggeredAlerts = [];
        const tenantRules = this.rules.get(context.tenantId) || this.rules.get('default') || [];
        for (const rule of tenantRules) {
            if (!rule.enabled)
                continue;
            const metricValue = context.metrics[rule.metric];
            if (metricValue === undefined)
                continue;
            let triggered = false;
            switch (rule.condition) {
                case 'gt':
                    triggered = metricValue > rule.threshold;
                    break;
                case 'lt':
                    triggered = metricValue < rule.threshold;
                    break;
                case 'eq':
                    triggered = metricValue === rule.threshold;
                    break;
            }
            if (triggered) {
                triggeredAlerts.push({
                    ruleId: rule.id,
                    ruleName: rule.name,
                    severity: rule.severity,
                    timestamp: Date.now(),
                    details: {
                        metric: rule.metric,
                        value: metricValue,
                        threshold: rule.threshold,
                        investigationId: context.investigationId,
                    },
                });
            }
        }
        return triggeredAlerts;
    }
}
exports.AlertingEngine = AlertingEngine;
