# JN-1: Scorecard v1 (KPIs/KRIs + Owners)

**Deliverable:** 1 dashboard + 1 page describing metric definitions.
**Acceptance:** Every metric has source-of-truth + update cadence.

## KPIs

1. **Option portfolio velocity**
   - Target: 6–10 options evaluated/week
   - Owner:
   - Source:

2. **Decision latency**
   - Target: <48h median time to decision
   - Owner:
   - Source:

3. **Execution readiness**
   - Target: 100% options with rollback criteria
   - Owner:
   - Source:

## KRIs

1. **Unmonitored critical events**
   - Target: 0
   - Owner:

2. **Policy violations / claim breaches**
   - Target: 0
   - Owner:

3. **Reputation shock indicators**
   - Monitor: Spikes in negative mentions, press inquiries
   - Owner:

## Tripwires

- Any KRI breach → **pause launch**, escalate to JU + JG, rollback within 24h
- Detection coverage <50% for a top campaign → **do not expand exposure**
- Partner asks for unsupported claims → **freeze outbound**, issue claim-safe alternatives
