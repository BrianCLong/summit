"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectorToCypher = selectorToCypher;
exports.computeScore = computeScore;
exports.dedupeAlerts = dedupeAlerts;
function selectorToCypher(selector) {
    const label = selector.label ? `:${selector.label}` : '';
    const params = {};
    const match = selector.match ?? {};
    const filters = Object.entries(match).map(([key, value]) => {
        params[key] = value;
        return `n.${key} = $${key}`;
    });
    const where = filters.length > 0 ? ` WHERE ${filters.join(' AND ')}` : '';
    return {
        query: `MATCH (n${label})${where} RETURN n`,
        params,
    };
}
function computeScore(weights, rule, data) {
    const score = Object.keys(weights).reduce((total, key) => {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            return total + weights[key];
        }
        return total;
    }, 0);
    const threshold = rule.threshold ?? 0;
    return score >= threshold ? score : 0;
}
function dedupeAlerts(alerts, newAlert, windowMs) {
    const createdAt = newAlert.createdAt;
    if (!createdAt) {
        return [...alerts, newAlert];
    }
    const newTime = createdAt.getTime();
    const newTimeInvalid = Number.isNaN(newTime);
    const isDuplicate = alerts.some((alert) => {
        if (!alert.createdAt)
            return false;
        if (alert.ruleId !== newAlert.ruleId)
            return false;
        if (alert.entityId !== newAlert.entityId)
            return false;
        const existingTime = alert.createdAt.getTime();
        const existingInvalid = Number.isNaN(existingTime);
        if (newTimeInvalid || existingInvalid) {
            return newTimeInvalid && existingInvalid;
        }
        const diff = Math.abs(existingTime - newTime);
        return diff <= windowMs;
    });
    return isDuplicate ? alerts : [...alerts, newAlert];
}
