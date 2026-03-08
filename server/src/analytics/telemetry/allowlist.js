"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALLOWLIST = void 0;
exports.isAllowedProp = isAllowedProp;
/**
 * Defines allowed properties for each event type.
 * Any property not in this list will be dropped.
 */
exports.ALLOWLIST = {
    'page_view': ['path', 'referrer', 'userAgent', 'duration'],
    'feature_usage': ['featureName', 'action', 'status', 'latency'],
    'api_call': ['endpoint', 'method', 'statusCode', 'durationMs'],
    'system_alert': ['alertId', 'severity', 'component'],
    'user_action': ['actionName', 'targetIdHash', 'context'],
};
function isAllowedProp(eventType, propName) {
    const allowed = exports.ALLOWLIST[eventType] || [];
    return allowed.includes(propName);
}
