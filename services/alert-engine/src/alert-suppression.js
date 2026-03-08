"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertSuppressor = void 0;
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'alert-suppressor' });
/**
 * Alert suppression and deduplication
 */
class AlertSuppressor {
    alertHistory = new Map();
    deduplicationKeys = new Set();
    /**
     * Check if alert should be suppressed
     */
    shouldSuppress(alert, rules) {
        if (!rules || rules.length === 0) {
            return false;
        }
        for (const rule of rules) {
            if (this.checkSuppressionRule(alert, rule)) {
                logger.debug({ alertId: alert.id, ruleType: rule.type }, 'Alert suppressed by rule');
                return true;
            }
        }
        return false;
    }
    /**
     * Check individual suppression rule
     */
    checkSuppressionRule(alert, rule) {
        switch (rule.type) {
            case 'duplicate':
                return this.checkDuplicateSuppression(alert, rule);
            case 'time_based':
                return this.checkTimeBasedSuppression(alert, rule);
            case 'count_based':
                return this.checkCountBasedSuppression(alert, rule);
            default:
                return false;
        }
    }
    /**
     * Check duplicate suppression
     */
    checkDuplicateSuppression(alert, rule) {
        if (!rule.deduplicationKey) {
            return false;
        }
        const key = rule.deduplicationKey(alert);
        if (this.deduplicationKeys.has(key)) {
            return true;
        }
        this.deduplicationKeys.add(key);
        // Clean up old keys periodically
        if (this.deduplicationKeys.size > 10000) {
            this.deduplicationKeys.clear();
        }
        return false;
    }
    /**
     * Check time-based suppression
     */
    checkTimeBasedSuppression(alert, rule) {
        if (!rule.windowMs) {
            return false;
        }
        const key = alert.deduplicationKey || `${alert.title}-${alert.source}`;
        const history = this.alertHistory.get(key) || [];
        const now = Date.now();
        // Remove old entries
        const recentHistory = history.filter((entry) => now - entry.timestamp < rule.windowMs);
        if (recentHistory.length > 0) {
            // Update history
            this.alertHistory.set(key, recentHistory);
            return true;
        }
        // Add to history
        recentHistory.push({ alertId: alert.id, timestamp: now });
        this.alertHistory.set(key, recentHistory);
        return false;
    }
    /**
     * Check count-based suppression
     */
    checkCountBasedSuppression(alert, rule) {
        if (!rule.windowMs || !rule.maxAlerts) {
            return false;
        }
        const key = alert.deduplicationKey || `${alert.title}-${alert.source}`;
        const history = this.alertHistory.get(key) || [];
        const now = Date.now();
        // Remove old entries
        const recentHistory = history.filter((entry) => now - entry.timestamp < rule.windowMs);
        // Add current alert
        recentHistory.push({ alertId: alert.id, timestamp: now });
        this.alertHistory.set(key, recentHistory);
        // Check if count exceeded
        return recentHistory.length > rule.maxAlerts;
    }
    /**
     * Clear suppression state
     */
    clear() {
        this.alertHistory.clear();
        this.deduplicationKeys.clear();
    }
}
exports.AlertSuppressor = AlertSuppressor;
