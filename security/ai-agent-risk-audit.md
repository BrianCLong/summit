# AI Agent Risk Audit and Hardening Plan

## Objectives
- Surface shadow AI agents across Summit tenants and workflows, then gate them through NIST AI RMF Govern controls.
- Reduce agentic security risks (prompt injection, over-permissioned agents, orphaned identities) with measurable guardrails.
- Align SOC 2 (security, availability, privacy), EU AI Act high-risk duties, and state chatbot disclosure laws.
- Produce defensible evidence (inventory, approvals, traces, revocation logs) for auditors and the AI Ethics/Governance board.

## Guiding Principles
- **Gateway-first**: All agents, MCP tools, and PR bots must route through a policy-enforcing gateway before accessing data, tools, or tenants.
- **Short-lived identity**: Default to ephemeral, scoped credentials with automatic revocation; static secrets are treated as critical findings.
- **Provenance everywhere**: Require signed inputs (YAML taxonomies, model artifacts, datasets) and attach source lineage to executions.
- **Observability as control**: Tracing and audit logs are not ancillary—they are blocking controls tied to MTTR SLOs and evidence packs.
- **Human guardrails**: High-risk actions (production writes, privilege elevation, cross-tenant reads) require explicit human approval with recorded rationale.

## Phase 1: Shadow Agent Discovery and Containment (Week 1)
- **Inventory**: Enumerate all agents, MCP tools, and GitHub PR bots referenced in `services/`, `tools/`, `server/`, `sdk/`, and CI workflows. Generate a manifest with owners, purpose, data scopes, hosting location, runtime triggers, and linked repositories.
- **Access map**: For each agent, capture credentials (API keys, NHIs, service accounts), data touchpoints (IntelGraph/graph stores, blob storage, PR pipelines), granted roles, and approval dates. Flag static secrets, shared accounts, and missing rotation SLAs.
- **Interface classification**: Categorize each agent by interface type (chat, webhook, scheduler, PR-bot, job-runner) and by tenant/data boundary to set baseline gateway policies and redaction profiles.
- **Containment controls**:
  - Route unmanaged agents through an AI gateway that enforces authentication, rate limits, tenant/data classification checks, and request/response schema validation.
  - Block or sandbox agents lacking owners, data tags, or runbooks; require owner sign-off and gateway policy attachment before re-enable.
  - Apply outbound egress controls for shadow agents until classification and least-privilege review are complete.
- **Blast-radius scoring**: Score each agent on reachability (tenants touched, tool breadth), privilege (write vs read-only), and execution autonomy; prioritize high-score agents for immediate sandboxing and runbook creation.
- **Evidence**: Store inventory, approvals, and access maps in an evidence folder with timestamps and reviewer identity; record decisions in an AI Ethics/Governance log (NIST Govern) and attach to SOC 2 control IDs.

## Phase 2: Agent Security Hardening (Weeks 2-3)
- **Prompt/interaction defenses**:
  - Add prompt guards for untrusted inputs (HTML/URL stripping, allowlists for commands) before tool execution; reject prompt-chains that bypass tool boundaries.
  - Enforce tool output schemas with strict validation, bounding box sizes, and deterministic rejection paths for ambiguous outputs.
  - Apply retrieval source whitelists to reduce cross-tenant bleed in graph/IntelGraph queries; add content filters for PII/PHI exfiltration attempts.
  - Add red-team prompt suites covering prompt injection, jailbreak, data exfiltration, and goal hijacking; fail builds on regressions.
- **Identity and privilege controls**:
  - Replace static tokens with short-lived, scoped credentials issued at runtime; rotate secrets and revoke orphaned NHIs automatically with audit trails.
  - Implement least-privilege policy bundles per agent role (read-only vs. write vs. admin) and enforce via gateway policies plus Just-In-Time elevation.
  - Require human-in-the-loop approval for privilege escalations and production write actions with recorded business justification and expiry times.
  - Enforce MFA/service-binding for operational consoles and disable unused service accounts weekly.
- **Supply chain and data poisoning**:
  - Scan YAML taxonomy ingestion, training data, and workflow definitions for untrusted inserts; require signatures, provenance metadata, and checksum validation.
  - Add CI checks for dependency integrity (lockfile diff review, signature verification) and model artifact attestation with SBOM linkage.
  - Quarantine anomalies and rerun training with clean baselines when tampering is detected; keep forensic snapshots for incident review.
- **Runtime controls**:
  - Enforce execution sandboxes with syscall/network policies per agent class; block file-system writes outside approved volumes.
  - Cap token/step budgets for autonomous chains; require explicit renewal for long-running tasks and log continuation approvals.
  - Add kill-switches for each agent class (CLI, PR, workflow, notebook) with pager-duty hooks and rollback scripts.

## Phase 3: Observability, Testing, and Reliability (Weeks 3-4)
- **Tracing and auditability**: Enable request/response tracing for agents and tools with correlation IDs, redaction, and 30-day retention; emit audit trails for code/data/identity changes with tenant and data-classification tags.
- **Live safety checks**: Monitor prompt-injection detectors, outbound call volume, data egress, privilege elevation attempts, and cross-tenant access; alert on deviations from policy or tenant boundaries.
- **MTTR target**: Configure runbooks, on-call rotations, and paging to keep AI-agent incidents under 5-minute detection-to-mitigation; rehearse via quarterly game days.
- **Evaluation**: Add regression tests for hallucination/goal drift in copilot outputs and PR automation; report failure trends to Governance board and block releases exceeding drift SLOs.
- **Resilience**: Add backpressure controls and rate limiting for agent chains; implement circuit breakers for downstream dependencies to prevent runaway actions.
- **Telemetry hygiene**: Ensure sensitive fields are masked at source, retain structured logs for joinability across tenants/tools, and ship daily integrity hashes for evidence packs.
- **Drift watch**: Auto-open tickets when agent behavior deviates from policies (unexpected tools, data domains, or destinations) and require sign-off before policy relaxations.

## Compliance Alignment
- **NIST AI RMF**: Map Govern-Map-Measure-Manage to the above phases; keep risk register entries with likelihood/impact, mitigation owners, and review cadence.
- **EU AI Act**: Log high-risk uses, maintain technical documentation, enforce data quality/traceability, and surface transparency notices in user-facing agent flows.
- **State chatbot laws & disclosures**: Ensure chat UIs label automated interactions, provide escalation to a human, and log user acknowledgments.
- **SOC 2, GDPR, HIPAA (if PHI/EU data)**: Maintain data flow diagrams, DPA/BAA coverage, access recertifications, incident playbooks tied to evidence folders, and data subject request workflows for agent outputs.
- **Audit pack**: Bundle inventories, access approvals, rotation logs, tracing exports, red-team reports, and exception waivers with retention schedules.
- **Control mapping detail**: Link each gateway policy, rotation job, and prompt-guard test to specific control IDs (e.g., SOC 2 CC6/CC7, HIPAA §164.308) with renewal cadence and compensating controls documented for exceptions.
- **Legal hooks**: Capture consent, disclosure, and data-sharing terms for each tenant; ensure automated agents reference the correct policy objects at runtime.

## Metrics and Acceptance Criteria
- 100% agent inventory coverage with owner, runbook, and data-scope tags; drift alerts on unregistered agents.
- 0 static production secrets; 100% short-lived credentials with rotation alerts and revocation proof within 15 minutes of offboarding.
- 99% policy-aligned executions (prompt guard + allowlist) with <0.5% false positives; red-team suite pass rate ≥99%.
- Detection-to-mitigation <5 minutes for agent incidents; weekly governance review of drift/hallucination rates with action items tracked to closure.
- CI gates block unsigned YAML taxonomies, dependency tampering, and unsigned model artifacts; SBOMs updated on every release.
- Weekly access recertification completion ≥98% with zero orphaned NHIs older than 24 hours; kill-switch drills complete within 2 minutes median.
- Telemetry completeness ≥99% for required fields (tenant, tool, action, data class) and audit-log integrity proofs verified daily.
- Evidence pack freshness <7 days; exception waivers auto-expire with alerts 72 hours before expiry.

## Automation and Evidence Generation
- Run `python tools/agent_audit.py --output security/agent-inventory.json --markdown security/agent-inventory.md` from the repo root to auto-generate the shadow-agent manifest with blast-radius scoring, data domains, and secret/permission findings.
- Add additional scan roots with `--paths path/to/custom/agents` to cover new services or staging sandboxes.
- Attach the generated Markdown summary to the AI Governance log and include the JSON manifest in the evidence bundle for SOC 2 and NIST AI RMF Govern artifacts.

## Next Actions for Jules/Codex
- Run shadow-agent inventory, generate manifest, and open PRs to enforce gateway routing for unmanaged agents.
- Wire prompt guards and scoped credentials into CLI and PR automation paths; fail builds on policy violations.
- Stand up observability dashboards and alerting keyed to tenant boundaries and data-classification tiers.
- Deliver SOC 2-ready evidence pack (inventory, access maps, approvals, audit logs) and map each control to NIST AI RMF functions.
- Automate blast-radius scoring and drift watch alerts; surface high-risk agents in a weekly Governance board packet with remediation owners.
