export interface TelemetryEvent {
  eventId: string;
  tenantIdHash: string;
  scopeHash: string; // Hashed user ID or session ID
  actorRole: string;
  eventType: string;
  ts: string; // ISO string
  props: Record<string, any>;
}

export type EventType =
  | 'page_view'
  | 'feature_usage'
  | 'api_call'
  | 'system_alert'
  | 'user_action'
  // Extend as needed
  ;

export interface TelemetryConfig {
  salt: string;
  logDir: string;
  enabled?: boolean;
}
