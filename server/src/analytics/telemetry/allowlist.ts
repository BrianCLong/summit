import { EventType } from './types.ts';

/**
 * Defines allowed properties for each event type.
 * Any property not in this list will be dropped.
 */
export const ALLOWLIST: Record<string, string[]> = {
  'page_view': ['path', 'referrer', 'userAgent', 'duration'],
  'feature_usage': ['featureName', 'action', 'status', 'latency'],
  'api_call': ['endpoint', 'method', 'statusCode', 'durationMs'],
  'system_alert': ['alertId', 'severity', 'component'],
  'user_action': ['actionName', 'targetIdHash', 'context'],
};

export function isAllowedProp(eventType: string, propName: string): boolean {
  const allowed = ALLOWLIST[eventType] || [];
  return allowed.includes(propName);
}
