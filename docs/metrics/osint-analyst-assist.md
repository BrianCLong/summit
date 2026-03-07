# OSINT Analyst Assist KPIs & Instrumentation

This document defines the core KPIs for the OSINT Analyst Assist desk and describes how they are measured within the system.

## Core KPIs

To ensure our AI lead qualification and OSINT flows are delivering value, we track the following high-level metrics per tenant:

### 1. Leads Per Hour (`leadsPerHour`)
**Definition:** The volume of new OSINT leads ingested and processed by the system within a given time window (default 24h), normalized to an hourly rate.
**Why it matters:** Indicates system throughput and helps gauge capacity. For dev laptops, a target of 10+ leads/hour indicates healthy end-to-end processing.
**How it's measured:** Count of `lead_created` events divided by the time window in hours.

### 2. Sufficient Evidence Rate (`sufficientEvidenceRate`)
**Definition:** The percentage of governed leads (leads that reached a Maestro decision) that met the minimum evidence threshold at the time of the decision.
**Sufficient Evidence Criteria:** A lead is considered to have sufficient evidence if it has:
  * At least 2 validated claims (`validatedClaims.length >= 2`).
  * No unresolved hard contradictions (`contradictions.length === 0`).
**Why it matters:** This is our primary proxy for "Quality". A high rate means the system is surfacing well-supported leads.
**How it's measured:** `leadsWithSufficientEvidence / leadsWithGovernedDecision`.

### 3. Override Rate (`overrideRate`)
**Definition:** The percentage of Maestro decisions (APPROVED/BLOCKED) that were later manually reversed or adjusted by a human analyst.
**Override Types:**
  * `APPROVE_WHEN_BLOCKED`: The analyst approved a lead the system initially blocked.
  * `BLOCK_WHEN_APPROVED`: The analyst blocked a lead the system initially approved.
  * `DOWNGRADE_CONFIDENCE`: The analyst significantly lowered the confidence score.
**Why it matters:** Overrides are a vital feedback loop. They should be interpreted as **signal about policy and threshold calibration**, not strictly as "errors". A high `APPROVE_WHEN_BLOCKED` rate might mean our thresholds are too strict. A high `BLOCK_WHEN_APPROVED` rate indicates we are letting too much noise through.
**How it's measured:** `analystOverrides / leadsWithGovernedDecision`.

## Instrumentation

We use a lightweight metrics sink implemented in `OSINTMetricsService` (`server/src/osint/metrics/OSINTMetricsService.ts`) to track these events.

### Event Schema

```typescript
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
```

### Event Hooks

1.  **Lead Created:** Hooked in `OSINTPipeline.ts` immediately upon receiving a query, before enrichment.
2.  **Governed Decision:** Hooked in `OSINTPipeline.ts` after entity resolution and claim validation. This event records the decision, evidence count, and boolean flags for sufficient evidence.
3.  **Analyst Override:** Captured via the `/api/osint/metrics/override` endpoint when an analyst interacts with the UI/CLI to change a decision.

### Endpoints

Metrics can be retrieved via:
*   `GET /api/osint/metrics?hours=24`: Returns aggregated KPIs for the current tenant.

### Testing & Verification

A CLI tool (`server/src/osint/metrics/OSINTMetricsCLI.ts`) is available to run synthetic leads through the pipeline and print the resulting KPIs to standard output, verifying that the system can meet the acceptance criteria of ≥10 leads/hour and >80% sufficient evidence rate on known-good synthetic data.
