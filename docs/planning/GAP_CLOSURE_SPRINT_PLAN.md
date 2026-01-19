# Execution Plan: Gap Closure (Sprints 1-3)

This plan prioritizes closing the most critical competitive gaps to ensure Summit (IntelGraph) delivers "product-grade" outcomes alongside its "platform-grade" primitives.

## Sprint 1: Parity Foundation

**Focus:** SDKs, Core Catalog, and Basic Visibility.

- **Connector SDK v1:** Release versioned schemas, idempotency keys, and replay logic.
- **"Golden 20" Phase 1:** Migrate first 5 connectors (Google Drive, GitHub, Jira, Okta, Slack) to SDK v1.
- **Workflow Debugger v1:** Timeline view of Maestro runs + receipt attachment.
- **Switchboard Catalog v1:** Core entity/service registration + owner assignments + search.
- **Policy Preflight:** Integrate simulation mode into approval flows.

## Sprint 2: Competitive UX

**Focus:** Scorecards, Self-Service, and Governance Explorers.

- **Scorecards v1:** Continuous evidence rules + exception handling + team rollups.
- **Self-service Actions v1:** Action catalog with approval gates, policy preflight, and receipt emission.
- **Governance Explorer v1:** "Request access" UI, visual lineage explorer, and policy rationale "why" pane.
- **Observability Pack:** Default SLO dashboards and alerting for ingest/workflow failure rates.
- **"Golden 20" Phase 2:** Migrate next 10 connectors.

## Sprint 3: Packaged Outcomes

**Focus:** Compliance, AI, and White-labeling.

- **Compliance Trust Pack v1:** SOC2-lite control set mapping + one-click evidence export.
- **AI Answer Citations:** Permission-aware retrieval with citations linking to system receipts.
- **Agent Action Gates:** Mandatory policy preflight + human-in-command for all agent-led tool calls.
- **White-label / Profile Kit:** Multi-brand support + policy presets per tenant profile.
- **"Golden 20" Completion:** All 20 connectors on SDK v1.

---

## Success Criteria per Sprint

1. **End of Sprint 1:** Can demo an ingest event with full lineage and a signed receipt.
2. **End of Sprint 2:** Can demo "Create new service" with automated scorecard and SLO attachment.
3. **End of Sprint 3:** Can export a SOC2 evidence bundle and show AI-cites-receipts answering a complex query.
