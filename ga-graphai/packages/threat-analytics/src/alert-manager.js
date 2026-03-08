"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertManager = void 0;
class AlertManager {
    activeAlerts = new Map();
    raise(input) {
        const dedupeKey = `${input.entityId}:${input.title}`;
        const existing = this.activeAlerts.get(dedupeKey);
        const createdAt = existing?.createdAt ?? new Date().toISOString();
        const severity = this.escalateSeverity(existing?.severity, input.severity);
        const score = Math.max(existing?.score ?? 0, input.score);
        const mergedIndicators = this.mergeIndicators(existing?.indicators ?? [], input.indicators);
        const alert = {
            id: existing?.id ?? dedupeKey,
            entityId: input.entityId,
            title: input.title,
            description: input.description,
            severity,
            score,
            indicators: mergedIndicators,
            patternMatches: input.patternMatches,
            behavior: input.behavior,
            temporal: input.temporal,
            triage: input.triage,
            createdAt,
            ruleIds: input.ruleIds,
        };
        this.activeAlerts.set(dedupeKey, alert);
        return alert;
    }
    list() {
        return Array.from(this.activeAlerts.values());
    }
    escalateSeverity(current, incoming) {
        const order = ['info', 'low', 'medium', 'high', 'critical'];
        if (!current)
            return incoming;
        return order[Math.max(order.indexOf(current), order.indexOf(incoming))];
    }
    mergeIndicators(existing, incoming) {
        const combined = [...existing];
        for (const indicator of incoming) {
            if (!combined.find((item) => item.value === indicator.value && item.type === indicator.type)) {
                combined.push(indicator);
            }
        }
        return combined;
    }
}
exports.AlertManager = AlertManager;
