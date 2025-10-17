# CodeRabbit Integration Prompt Catalog

This catalog translates the CodeRabbit integration program into actionable Codex UI prompts. It is organized by phase so that Summit (IntelGraph) delivery teams can queue targeted automation tasks inside Maestro Conductor and associated CI/CD workflows.

Each prompt template contains:

- **Purpose** — why we are asking Codex to act.
- **Context payload** — the repositories, services, or docs Codex should inspect.
- **Acceptance Criteria** — testable outcomes Codex must confirm before completion.
- **Escalation Hooks** — follow-up prompts that unblock deeper work or hand-offs.

Use these templates as starting points and adjust scope, file paths, or telemetry targets to match sprint goals.

---

## Phase 1 — API & Webhook Integration

### Prompt: Build CodeRabbit Connector Service
- **Purpose**: Scaffold a `coderabbit-connector` Nest.js service that exchanges PR metadata and review artifacts between Summit’s GitHub org and CodeRabbit’s API.
- **Context payload**:
  - `docs/CONNECTORS.md`
  - `server/src/modules/integrations`
  - CodeRabbit API reference (include relevant endpoint excerpts).
  - Existing Maestro Conductor webhook ingestion patterns in `server/src/modules/webhooks`.
- **Acceptance Criteria**:
  1. Adds REST client module with typed DTOs for CodeRabbit review create/list endpoints.
  2. Exposes POST `/integrations/coderabbit/reviews` endpoint guarded by Summit auth middleware.
  3. Includes Jest contract tests that stub CodeRabbit responses and verify persistence to IntelGraph Neo4j models.
  4. Updates OpenAPI and GraphQL schema documentation.
- **Escalation Hooks**:
  - “Generate a migration for new `CodeReviewSession` nodes/relationships.”
  - “Draft Terraform secrets for CodeRabbit API tokens.”

### Prompt: Webhook Listener Lambda
- **Purpose**: Provision AWS Lambda (Python) that ingests CodeRabbit webhook events and publishes them to Summit EventBridge bus.
- **Context payload**:
  - `infrastructure/aws/lambda-template`
  - `docs/DEPLOYMENT.md`
  - CodeRabbit webhook payload examples.
- **Acceptance Criteria**:
  1. Lambda handler validates HMAC signature using stored secret.
  2. Normalizes event into Summit’s `CodeReviewFindingCreated` schema.
  3. Includes unit tests with local payload fixtures.
  4. Terraform module updates with IAM least privilege policy.
- **Escalation Hooks**:
  - “Author runbook entry for CodeRabbit webhook operations.”

---

## Phase 2 — Workflow & Pipeline Automation

### Prompt: Maestro Conductor Gate Plugin
- **Purpose**: Create a Maestro Conductor plugin that triggers CodeRabbit reviews as a pre-merge gate when PRs target protected branches.
- **Context payload**:
  - `ga-graphai/packages/maestro-conductor`
  - `docs/MAESTRO_META_ORCHESTRATOR_SPEC.md`
  - CodeRabbit CLI docs for triggering reviews.
- **Acceptance Criteria**:
  1. Adds plugin configuration schema with repository allowlist.
  2. Implements async task that calls CodeRabbit review API and polls status until completion.
  3. Emits structured events to Conductor telemetry channel.
  4. Includes integration test scenario in `packages/maestro-conductor/__tests__`.
- **Escalation Hooks**:
  - “Wire plugin into `maestro.conductor.yaml` default pipeline.”

### Prompt: Risk Graph Enrichment Job
- **Purpose**: Extend IntelGraph job that enriches risk scores with incoming CodeRabbit findings.
- **Context payload**:
  - `server/src/jobs/risk`
  - `docs/DATA_MODEL.md`
  - Sample CodeRabbit severity taxonomy.
- **Acceptance Criteria**:
  1. Maps CodeRabbit severity levels to Summit risk categories.
  2. Updates Neo4j queries to create `:CODE_REVIEW_FINDING` nodes linked to affected services.
  3. Provides regression test covering risk recalculation.
  4. Documents data lineage changes in `docs/DATA_MODEL.md`.
- **Escalation Hooks**:
  - “Generate Grafana panel for CodeRabbit-derived risk deltas.”

---

## Phase 3 — UX & Developer Tools Integration

### Prompt: Code Review Command Center UI
- **Purpose**: Design React dashboard module showing CodeRabbit summaries, inline threads, and Maestro pipeline state.
- **Context payload**:
  - `client/src/features/reviews`
  - `docs/UI_SPEC.md`
  - Figma export or screenshots of desired layout.
- **Acceptance Criteria**:
  1. Creates responsive panel with summary, timeline, and filters.
  2. Integrates WebSocket feed for live CodeRabbit comment streaming.
  3. Adds Storybook stories with mocked data.
  4. Provides Cypress smoke test covering end-to-end fetch.
- **Escalation Hooks**:
  - “Implement keyboard shortcuts for triaging review findings.”

### Prompt: IDE Extension Data Bridge
- **Purpose**: Implement shared SDK that surfaces Summit context (risk score, ownership) inside VS Code, Cursor, and Windsurf plugins.
- **Context payload**:
  - `tools/ide-extensions`
  - `docs/DEVELOPER_ONBOARDING.md`
  - Summit GraphQL queries for code intelligence.
- **Acceptance Criteria**:
  1. Provides TypeScript client library with typed queries.
  2. Demonstrates VS Code command `IntelGraph: Show CodeRabbit Insights`.
  3. Supplies unit tests using mocked GraphQL responses.
  4. Adds developer quickstart guide in `docs/tools/ide-extensions.md`.
- **Escalation Hooks**:
  - “Publish preview build to VSIX feed with release notes.”

---

## Phase 4 — Autofix & Issue Management

### Prompt: Autofix PR Orchestrator
- **Purpose**: Connect CodeRabbit autofix suggestions to Maestro Conductor’s branch automation for gated merges.
- **Context payload**:
  - `ga-graphai/packages/maestro-conductor`
  - `docs/CONDUCTOR_EVOLUTION_STRATEGY.md`
  - Sample GitHub app workflow definitions.
- **Acceptance Criteria**:
  1. Consumes CodeRabbit autofix payloads and stages patches on feature branches.
  2. Runs regression test suite before opening PR.
  3. Posts summary comment with diff stats and risk tags.
  4. Includes rollback plan in docs/CONDUCTOR_EVOLUTION_STRATEGY.md.
- **Escalation Hooks**:
  - “Enable human approval checkpoint before merge.”

### Prompt: Issue Synchronization Ruleset
- **Purpose**: Automate creation and linking of Jira/Linear tickets based on CodeRabbit review outcomes.
- **Context payload**:
  - `server/src/modules/integrations/jira`
  - `server/src/modules/integrations/linear`
  - `docs/WORKFLOW_OPTIMIZATION_PLAN.md`.
- **Acceptance Criteria**:
  1. Defines mapping from CodeRabbit severity to ticket priority and SLA.
  2. Adds deduplication logic to prevent duplicate issues.
  3. Provides Jest tests covering Jira and Linear flows.
  4. Documents escalation policies in `docs/WORKFLOW_OPTIMIZATION_PLAN.md`.
- **Escalation Hooks**:
  - “Trigger retroactive sync for backlog of CodeRabbit findings.”

---

## Phase 5 — Quality Control & Reporting

### Prompt: Code Quality Gate Enforcement
- **Purpose**: Enforce Summit CI to fail on CodeRabbit critical findings, surfacing actionable diagnostics.
- **Context payload**:
  - `ci/pipelines`
  - `docs/CI_DECISIONS.md`
  - CodeRabbit severity definitions.
- **Acceptance Criteria**:
  1. Adds pipeline step that queries CodeRabbit status API.
  2. Blocks merge when critical findings remain unresolved.
  3. Writes structured log events to OpenTelemetry exporter.
  4. Updates CI documentation with remediation steps.
- **Escalation Hooks**:
  - “Add Slack alerting for blocked merges including owner mentions.”

### Prompt: Executive Analytics Dashboard
- **Purpose**: Extend Grafana/Looker dashboards with CodeRabbit coverage, MTTR, and adoption KPIs.
- **Context payload**:
  - `observability/grafana`
  - `docs/OBSERVABILITY_SLOs.md`
  - CodeRabbit reporting API docs.
- **Acceptance Criteria**:
  1. New dashboard panels for review volume, fix rate, and SLA compliance.
  2. Data source integration pulling from Summit analytics warehouse.
  3. Synthetic tests ensuring metrics update hourly.
  4. Documentation snippet for executive weekly reports.
- **Escalation Hooks**:
  - “Produce quarterly trend analysis slide deck.”

---

## Phase 6 — Security & Compliance Alignment

### Prompt: Joint Security Control Matrix
- **Purpose**: Map CodeRabbit SOC2/GDPR controls into Summit GRC inventory for auditors.
- **Context payload**:
  - `compliance/soc2`
  - `docs/SECURITY_AND_PRIVACY.md`
  - CodeRabbit trust center references.
- **Acceptance Criteria**:
  1. Produces control matrix with owner, evidence source, and validation cadence.
  2. Creates checklist for annual vendor review.
  3. Adds automated reminder tasks in Summit compliance workflow.
  4. Stores matrix in version-controlled CSV or Markdown with changelog.
- **Escalation Hooks**:
  - “Schedule tabletop exercise around CodeRabbit data handling.”

### Prompt: Audit Logging Enhancements
- **Purpose**: Ensure CodeRabbit interactions are captured in Summit’s unified audit trail.
- **Context payload**:
  - `server/src/modules/audit`
  - `docs/SECURITY_ACTION_PLAN.md`
  - Existing audit event schemas.
- **Acceptance Criteria**:
  1. Adds new audit event types for CodeRabbit review fetch, comment sync, and autofix execution.
  2. Publishes events to Kafka topic with PII scrubbing.
  3. Provides automated tests verifying log integrity and retention tags.
  4. Documents updated data retention policy crosswalk.
- **Escalation Hooks**:
  - “Integrate anomaly detection for suspicious CodeRabbit activity.”

---

## Usage Guidance

1. **Start narrow** — select the prompt matching your sprint objective and customize context paths to the specific services or packages under change.
2. **Embed telemetry expectations** — when copying a template into Codex, add log, trace, or metric requirements to reinforce observability-first delivery.
3. **Document outcomes** — follow up each completed prompt with status updates in Maestro Conductor run logs and relevant docs to keep the integration ledger current.

These prompts provide a structured runway for blending CodeRabbit’s AI review capabilities into Summit while maintaining compliance, observability, and developer experience standards.
