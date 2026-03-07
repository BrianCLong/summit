export interface OSINTMetricsEvent {
  tenantId: string;
  timestamp: string;
  eventType: 'lead_created' | 'governed_decision' | 'analyst_override' | 'lead_published';
  leadId: string;
  details?: {
    decision?: 'APPROVED' | 'BLOCKED';
    hasSufficientEvidence?: boolean;
    evidenceCount?: number;
    hasMultiSourceCorroboration?: boolean;
    overrideType?: 'APPROVE_WHEN_BLOCKED' | 'BLOCK_WHEN_APPROVED' | 'DOWNGRADE_CONFIDENCE';
    [key: string]: any;
  };
}

// In-memory/lite DB for metrics (simulating a lightweight metrics sink)
// For MVP, we can just use an array, but per-day buckets are better
const metricsStore: OSINTMetricsEvent[] = [];

export class OSINTMetricsService {
  static recordEvent(event: Omit<OSINTMetricsEvent, 'timestamp'>) {
    const fullEvent: OSINTMetricsEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };
    metricsStore.push(fullEvent);
    console.log(`[OSINT Metrics] Recorded: ${event.eventType} for lead ${event.leadId}`);
  }

  static getMetrics(tenantId: string, hours: number = 24) {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);

    const relevantEvents = metricsStore.filter(e =>
      e.tenantId === tenantId && new Date(e.timestamp) >= cutoffTime
    );

    const leadsCreated = relevantEvents.filter(e => e.eventType === 'lead_created').length;

    const governedEvents = relevantEvents.filter(e => e.eventType === 'governed_decision');
    const leadsWithGovernedDecision = governedEvents.length;

    const leadsWithSufficientEvidence = governedEvents.filter(e =>
      e.details?.hasSufficientEvidence === true
    ).length;

    const overrideEvents = relevantEvents.filter(e => e.eventType === 'analyst_override');
    const analystOverrides = overrideEvents.length;

    // override types breakdown
    const overrideTypes = overrideEvents.reduce((acc, e) => {
      const type = e.details?.overrideType || 'UNKNOWN';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // KPIs
    const leadsPerHour = leadsCreated / hours;
    const governedLeadRate = leadsCreated > 0 ? (leadsWithGovernedDecision / leadsCreated) : 0;
    const overrideRate = leadsWithGovernedDecision > 0 ? (analystOverrides / leadsWithGovernedDecision) : 0;
    const sufficientEvidenceRate = leadsWithGovernedDecision > 0 ? (leadsWithSufficientEvidence / leadsWithGovernedDecision) : 0;

    return {
      timeWindowHours: hours,
      rawCounts: {
        leadsCreated,
        leadsWithGovernedDecision,
        leadsWithSufficientEvidence,
        analystOverrides,
        overrideTypes
      },
      kpis: {
        leadsPerHour: Number(leadsPerHour.toFixed(2)),
        governedLeadRate: Number(governedLeadRate.toFixed(2)),
        overrideRate: Number(overrideRate.toFixed(2)),
        sufficientEvidenceRate: Number(sufficientEvidenceRate.toFixed(2))
      }
    };
  }

  // For testing purposes
  static _clearStore() {
    metricsStore.length = 0;
  }
}
