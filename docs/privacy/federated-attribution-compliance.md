# Federated Attribution Engine Privacy & Compliance Brief

## Overview

The federated attribution engine introduces a privacy-first measurement layer for user journeys across distributed surfaces. It combines consent-aware tracking, multi-touch attribution, privacy-safe cohort analytics, and real-time scoring with strict governance controls. The system is designed for production workloads that must comply with GDPR, CCPA/CPRA, LGPD, and ePrivacy expectations.

## Data Minimization & Governance

- **Consent enforcement:** All touchpoints must reference a valid consent record per domain before storage. Missing or expired consent skips the event and logs the decision for audit.
- **Scoped retention:** Journey data is pruned on a rolling basis (`retentionWindowDays`) to guarantee short-lived storage and reduce risk of stale identifiers.
- **Node registry:** Federated ingestion nodes register capabilities and heartbeat data so privacy teams can audit which regions process user information.
- **Configurable lookback:** Conversion analysis is restricted to a configurable window (`lookbackWindowDays`) to prevent long-term profiling.

## Cross-Domain & Consent Management

- Supports granular consent types (analytics, personalization, advertising, cross-domain).
- Consent refresh intervals are automatically enforced, prompting renewed approval when records age out.
- Cross-domain touchpoints are recorded only when the `cross_domain` consent scope is present, enabling enterprise-level tracking without violating policy boundaries.

## Privacy-Safe Cohort Analytics

- Cohorts require a configurable minimum population before metrics are surfaced, eliminating the risk of single-user exposure.
- Differential privacy noise (Laplace mechanism) is applied per cohort export using the configured epsilon value.
- Aggregated metrics include total value, average revenue, average touches, and channel diversity with noise disclosure for downstream analysts.

## Real-Time Attribution Controls

- Real-time scoring respects consent gates prior to computing contributions.
- Streaming results are dispatched only to registered analytics connectors that pass health checks and are audited for scope alignment.
- Scoring windows (`realTimeWindowMinutes`) ensure transient storage of fast-path metrics, reducing the blast radius of identifiers in memory.

## Data Subject Rights & Auditability

- Consent histories are retrievable per user and domain for DSAR responses.
- Event skip reasons (e.g., `missing_consent`) are emitted for compliance logging.
- Configurable connectors allow integration with subject rights management workflows, ensuring revocations cascade quickly.

## Deployment Checklist

1. Configure jurisdiction-specific defaults for consent expiration and lookback periods.
2. Register analytics connectors with documented data processing agreements.
3. Wire connector error events into centralized logging for compliance monitoring.
4. Validate that federated nodes operate within approved data residency zones.
5. Run privacy regression tests (see `server/tests/federatedAttributionEngine.test.ts`) before each release.

## Change Management

- Updates to attribution models or privacy parameters must pass architecture review.
- Document any reduction in cohort thresholds or epsilon adjustments in release notes.
- Ensure downstream analytics teams are notified of schema or payload format changes.

Maintaining these guardrails keeps the attribution engine production-ready while aligning with global privacy regulations and internal governance policies.
