import { SecuriteyesService } from './SecuriteyesService.js';
import { NODE_LABELS, RELATIONSHIPS, SuspiciousEvent } from '../models/types.js';

export interface TelemetrySignal {
    source: string;
    type: string;
    tenantId: string;
    payload: any;
    timestamp: string;
}

export interface ThreatFeedItem {
    indicator: string;
    type: 'ip' | 'domain' | 'hash' | 'url';
    source: string;
    confidence: number;
    tags: string[];
}

export class IngestionService {
    private static instance: IngestionService;
    private securiteyes: SecuriteyesService;

    private constructor() {
        this.securiteyes = SecuriteyesService.getInstance();
    }

    public static getInstance(): IngestionService {
        if (!IngestionService.instance) {
            IngestionService.instance = new IngestionService();
        }
        return IngestionService.instance;
    }

    async ingestInternalSignal(signal: TelemetrySignal): Promise<SuspiciousEvent | null> {
        // We must persist potentially relevant signals (like login_failed) even if not immediately critical
        // so that stateful rules can look back at history.
        // However, we don't want to flood the graph with "SuspiciousEvent" nodes for every normal login.
        // A better approach for this system would be to have a separate "RawEvent" store, but for this task
        // we will create SuspiciousEvent nodes with 'low' severity for signals that might contribute to a pattern.

        const isCritical = signal.type.toLowerCase().includes('suspicious') || signal.type === 'deception_access';
        const isRelevantForHistory = signal.type === 'login_failed' || signal.type === 'api_call_blocked';

        if (isCritical || isRelevantForHistory) {
            const severity = isCritical ? 'high' : 'low';

            const event = await this.securiteyes.createSuspiciousEvent({
                tenantId: signal.tenantId,
                eventType: signal.type,
                severity: (signal.payload.severity as any) || severity,
                details: signal.payload,
                sourceDetector: signal.source,
                timestamp: signal.timestamp
            });
            return event;
        }

        return null;
    }

    async ingestThreatFeed(items: ThreatFeedItem[], tenantId: string = 'system'): Promise<void> {
        for (const item of items) {
            await this.securiteyes.createIndicator({
                tenantId,
                type: item.type,
                value: item.indicator,
                source: item.source,
                firstSeen: new Date().toISOString(),
                lastSeen: new Date().toISOString()
            });
        }
    }
}
