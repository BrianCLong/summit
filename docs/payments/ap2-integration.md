# AP2 Integration Blueprint

## Overview

The Agent Payments Protocol (AP2) provides cryptographically verifiable agent-to-agent transaction flows. Summit can host AP2 mandates alongside its investigation graph to support secure, automated disbursements and settlements. This document outlines how to map AP2 responsibilities onto existing Summit capabilities and where extensions are required.

## Architectural Fit

- **Modular services** – Summit already exposes REST and GraphQL APIs for investigations, entities, and orchestration. AP2-specific mutations and webhooks can be layered onto the same API gateway and service mesh.
- **Security controls** – JWT-based auth, RBAC, and optional OPA policy checks align with AP2's requirement for signed mandates, least-privilege enforcement, and auditability.
- **Data stores** – PostgreSQL (transaction state) and Neo4j (relationship provenance) accommodate mandate lifecycles, counterparty metadata, and payment traceability. Append-only audit logs ensure evidentiary integrity.
- **Observability** – Prometheus/Grafana dashboards and the event pipeline can ingest AP2 metrics (mandates created, approvals, declines, SLA breaches) for operational oversight.

## Core Integration Tasks

1. **Modeling**
   - Introduce AP2 mandate, transaction, and dispute entities to the shared schema (TypeScript types, GraphQL SDL, PostgreSQL migrations).
   - Extend provenance linking so mandates reference originating investigations, copilots, and analysts.
2. **API Extensions**
   - Implement GraphQL mutations and REST endpoints for mandate draft, signature, broadcast, and fulfillment callbacks.
   - Enforce multi-step signing (agent, supervisor, automated policy) with deterministic status transitions and idempotency keys.
3. **Workflow Automation**
   - Update copilot playbooks to surface "Initiate AP2 mandate" actions, conditioned by RBAC/OPA policy checks.
   - Allow narrative simulation and case timelines to embed payment intents, approvals, and ledger outcomes.
4. **Security & Compliance**
   - Capture AP2 event signatures, certificate chains, and verification timestamps in the audit log stream.
   - Introduce compliance automations for PCI, SOC 2, and NIST SP 800-53 controls tied to payment activities.
5. **Monitoring & Reporting**
   - Publish AP2-specific dashboards (success rate, fraud alerts, SLA adherence).
   - Feed anomaly detectors and counter-fraud models with AP2 telemetry for near-real-time intervention.

## Implementation Checklist

- [ ] Define AP2 schema additions (entities, enums, relationships) and update TypeScript/GraphQL models.
- [ ] Author PostgreSQL migrations and seed data for mandate lifecycle tracking.
- [ ] Implement service-layer mandate orchestration with signature verification, retries, and dispute handling.
- [ ] Register AP2 webhook handlers and background jobs (settlement confirmation, reconciliation).
- [ ] Extend audit logging to capture cryptographic proofs, policy decisions, and human/agent sign-offs.
- [ ] Update observability assets (Grafana, alert rules, runbooks) with AP2 metrics and failure modes.
- [ ] Provide UI affordances in investigator and copilot views for initiating and monitoring mandates.

## Dependencies & Open Questions

- Confirm hardware security module (HSM) requirements for private key custody.
- Determine whether AP2 mandates require integration with existing payments providers (Stripe, ACH, FedNow) or operate as a meta-orchestration layer.
- Validate legal/regulatory coverage for jurisdictions where Summit operates (export controls, financial regulations).
- Align AP2 dispute workflows with existing incident response and fraud investigation processes.
