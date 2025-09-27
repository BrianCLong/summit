export type HoneytokenType = 'email' | 'file-beacon' | 'unique-phrase';

export interface Honeytoken {
  id: string;
  displayName: string;
  type: HoneytokenType;
  tokenValue: string;
  plantedBy: string;
  sourceSystem: string;
  tags: string[];
  createdAt: Date;
  expiresAt: Date;
  leakScore: number;
  callbackHistory: LeakCallback[];
  metadata?: Record<string, unknown>;
}

export interface LeakCallback {
  id: string;
  observedAt: Date;
  channel: 'http-callback' | 'inbox-hit' | 'keyword-scan';
  sourceAddress?: string;
  context?: Record<string, unknown>;
}

export interface PlantHoneytokenInput {
  type: HoneytokenType;
  plantedBy: string;
  sourceSystem: string;
  tags?: string[];
  ttlSeconds: number;
  metadata?: Record<string, unknown>;
}

export interface CallbackEvent {
  tokenValue: string;
  channel: LeakCallback['channel'];
  sourceAddress?: string;
  context?: Record<string, unknown>;
}

export interface AttributionResult {
  token: Honeytoken;
  leakCallback: LeakCallback;
  confidence: number;
}

export interface DashboardSummary {
  totals: {
    planted: number;
    active: number;
    expired: number;
  };
  tokensByType: Record<HoneytokenType, number>;
  topAlerts: Array<{
    tokenId: string;
    displayName: string;
    leakScore: number;
    lastSeen: Date | null;
  }>;
  recentActivity: Array<{
    tokenId: string;
    callbackId: string;
    observedAt: Date;
    channel: LeakCallback['channel'];
    sourceAddress?: string;
  }>;
}

export interface IncidentWebhookPayload {
  incidentId: string;
  tokenId: string;
  tokenType: HoneytokenType;
  tokenDisplayName: string;
  leakScore: number;
  sourceSystem: string;
  channel: LeakCallback['channel'];
  observedAt: string;
  confidence: number;
  tags: string[];
}

export interface WebhookDispatcher {
  dispatch(payload: IncidentWebhookPayload): Promise<void>;
}

export interface LeakScoringModel {
  score(token: Honeytoken, callback: LeakCallback): number;
}
