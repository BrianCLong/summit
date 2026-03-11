# Trust Portal Summary Schema

This document details the external-facing schema for the Summit Trust Portal. The Portal is read-only, aggregated, and de-identified to ensure operational details and Personal Identifiable Information (PII) are not exposed, aligning with AI trust and governance principles.

## Philosophy
The Trust Portal bridges the gap between adversarial resilience and customer transparency. By summarizing narrative risk, persona/campaign risk, and automation/governance decisions, we fulfill standard compliance and trust framework requirements (AI TRiSM, NIST AI RMF) without providing an attack surface.

## Core Schema Types

### TrustRiskSummary
Aggregates statistics related to detected campaign and narrative risks. It deliberately strips internal IDs.
- `riskDistribution`: Breakdown of handled risks (LOW/MEDIUM/HIGH).
- `highRiskAlertsHandled`: The total number of elevated alerts securely handled by Summit.
- `topNarrativeRisks`: Categories of risks seen across the system.

### GovernanceSummary
Details how the Governance Council operates over sensitive decisions. No code details or internal reviewer IDs are surfaced.
- `tier2And3Decisions`: Count of high-risk changes.
- `averageApprovalTimeMs`: Responsiveness of the governing body.
- `majorCategories`: The types of changes governed (e.g. ontology updates, exports).

### AutomationSafetySummary
Summarizes automated responses taken by the engine.
- `actionsByClass`: Distribution of automated responses (e.g., watchlist additions vs reports).
- `councilApprovalsRequired`: How many times automation stopped to enforce human-in-the-loop.
- `autoApprovals`: How many routine decisions were handled autonomously.

## Redaction Layer

A specialized redaction function (`src/trust/summary_model.ts`) maps the internal representations directly into these generic schemas. This mapping layer strictly filters out any properties not defined in the output summary objects.
