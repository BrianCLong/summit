# Summit Portfolio → GitHub Roadmap

_Last updated: 2025-10-03_

## 1. Portfolio Overview

Summit runs three flagship platforms plus shared evidence/compliance services. This roadmap unifies their delivery commitments into a single GitHub execution plan.

| Program | Vision | Primary Docs |
|---------|--------|--------------|
| **IntelGraph (Tracks A–F)** | Policy-native intelligence graph with governance-by-design | `docs/github-project-plan.md`, `project_management/issues/*.md`, `project_management/epics/*.md` |
| **Maestro** | Autonomy orchestration for runbooks, pipelines, and evidence automation | `SUMMIT_MAESTRO_DELIVERY_PLAN.md`, `docs/summit_maestro_product_requirements_document_prd_v_1.md` |
| **Conductor** | Customer-facing operations console + evidence pipelines | `docs/CONDUCTOR_30_60_90_ROADMAP.md`, `docs/CONDUCTOR_PRD_v1.0.md` |
| **CompanyOS** | Org-as-code operating model and autonomy budgets | `docs/ROADMAP.md`, `companyos/` modules |
| **Cross-Cutting** | Compliance, reliability, GTM, security | `docs/GA_CRITERIA.md`, `docs/SECURITY_ACTION_PLAN.md`, `project_management/threat-model-tickets.csv` |

## 2. Release Timeline & Milestones

| Quarter | IntelGraph | Maestro | Conductor | CompanyOS | Cross-Cutting Gates |
|---------|------------|---------|-----------|-----------|---------------------|
| **Q4 2025** | M0–M6 GA run (graph core → prov-ledger) | MVP control plane, runners, policy gate | 30-day hardening & multi-region plan | Org-as-code + autonomy budgets | SOC2 evidence lockers, Kyverno/SLSA rollout |
| **Q1 2026** | Copilot hardening, analytics suite alpha | DAG caching, provenance GA, SDK parity | Revenue instrumentation, multi-region cutover | Agent Adapter Layer + ecosystem bridges | Cost guardrails, chaos drills, security posture review |
| **Q2 2026** | Pattern miner, governance simulation UI | Contained L3 playbooks, evidence automation | Growth experiments, marketplace integrations | Contained-L3 pilots, ROI reporting | Compliance packs (HIPAA/PCI), trust reports |
| **H2 2026** | Predictive suite, export manifests GA | Blueprints + external marketplace | Enterprise onboarding automation | Autonomy credit market, Org Mesh Twin v2 | FedRAMP/HIPAA overlays, global residency |

## 3. Workstream Roadmaps

### 3.1 IntelGraph (Tracks A–F)

**Outcome:** GA graph intelligence platform with governed ingestion, analytics, and audit-ready provenance.

| Track | Epics & Key Deliverables | Dependencies | Target Sprint | Success Metrics |
|-------|--------------------------|--------------|---------------|-----------------|
| **A: Core Graph** | `A1` Canonical schema & policy labels; `A2` Bitemporal model; `A3` ER v1; `A4` Provenance ledger; `A5` Ten GA connectors | Requires DB migrations, ingest pipeline | Sprints M1–M3 | 95% schema tests green; ≥10 connectors w/ golden IO; ER p95 merge <200ms |
| **B: Copilot / RAG** | `B1` NL→Cypher sandbox; `B2` GraphRAG evidence-first; `B3` Guardrails & model cards | Dependent on A-tracks, policy bundles | Sprints M3–M4 | 95% syntactic validity; 100% answers cite claims; guardrail denials with reason |
| **C: Analytics** | `C1` Path/community/centrality suite; `C2` Pattern miner templates | Graph metrics libraries, GPU option | Sprints M3–Q1’26 | Benchmarks reproducible; ≥20 templates versioned |
| **D: Frontend** | `D1` Tri-pane shell; `D2` XAI overlays; `D3` ER adjudication UI | `feature/cytoscape-view`, ER APIs | Sprints M1–M4 | TTFI <2.5s; accessibility AA; 200ms queue ops |
| **E: Policy & Audit** | `E1` ABAC via OPA; `E2` License/TOS enforcement | Needs policy registry, audit store | Sprints M4–M5 | Policy simulations w/ dry-run; blocked exports cite clause |
| **F: Ops & Cost** | `F1` Observability & SLO; `F2` Cost guardrails; `F3` DR/BCP offline kit | Requires OTEL stack, chaos harness | Sprints M2–Q1’26 | SLO dashboards live; slow-query killer success rate; chaos drill pass |

**Key artifacts:**
- Backlog YAML/JSON for import (`project_management/backlog/backlog.json`).
- PR sanitization workflow `scripts/pr_sanitize.sh` to keep evidence clean.
- Acceptance suites in `tests/` (unit, Gherkin, fuzz).

### 3.2 Maestro Platform

**Outcome:** Autonomy orchestration with evidence-first controls.

| Phase | Epic Bundles | Dependencies | Exit Criteria |
|-------|--------------|--------------|---------------|
| **MVP (Oct 2025)** | Control Plane Foundation (SM‑CP); Workflow Compiler (SM‑WF); Runners (SM‑RUN); SDKs (SM‑SDK); Policy Gate (SM‑POL); Operator Console (SM‑CON); Reference tasks (SM‑CAT) | Needs infra cluster, secrets, CI gating | API online with ≥99.9% availability; runners for K8s/containers/local; 10 tasks, 8 runbooks |
| **GA (Dec 2025)** | Provenance & Disclosure (SM‑PROV); Observability & FinOps (SM‑OBS); Blueprints (SM‑BLUE); Supply-chain security (SM‑SEC); SIG integration (SM‑INT) | Integrates with IntelGraph ledger & evidence store | Signed manifests, attested deploys; budgets/quotas enforced; disclosure packager emits bundles |
| **Q1 2026** | DAG caching & replay (SM‑WF-114); Evidence automation; Autonomy budgets | Relies on CompanyOS autonomy ledger | Replay determinism ≥99%; SOC2 control mapping automated |
| **Q2 2026** | Contained L3 playbooks (SRE, FinOps, Growth); External marketplace adapters | Depends on Copilot guardrails, SDK parity | Documented ROI ≥20% cycle time reduction; autop approvals logged |

### 3.3 Conductor

**Outcome:** Customer operations console with evidence pipelines and revenue instrumentation.

| Horizon | Focus Areas | Critical Tasks |
|---------|-------------|----------------|
| **30 Days** | Production hardening, monitoring, API versioning | Automate acceptance tests, deploy Grafana dashboards, finalize residency decision |
| **60 Days** | Multi-region architecture, CCP governance | Complete region-specific policy bundles, canary pipeline, advisory board setup |
| **90 Days** | Growth & GTM readiness | Customer pilots, marketplace integration, case studies, cost-efficiency goals |
| **Beyond** | Partner integrations, automation marketplace | Launch self-serve onboarding, app directory, billing alignment |

### 3.4 CompanyOS

**Outcome:** Org-as-code with autonomy credits, governance telemetry, and ROI evidence.

- **Now (Q4 2025):** Ship autonomy budgets, anti-sprawl quotas, SLSA attestations + Kyverno gating, Org Mesh Twin dashboard seed (`docs/ROADMAP.md` section “Q0 now–6 weeks”).
- **Q1 2026:** Deliver Agent Adapter Layer (LangGraph/AutoGen/Semantic Kernel bridges), memory/tool adapters, console metrics.
- **Q2 2026:** Roll out contained Level-3 autonomy playbooks (SRE, Finance, Growth), evidence automation for SOC2/ISO, pilot at 3 customers with causal ROI proofs.
- **H2 2026:** Launch autonomy credit market, compliance overlays (HIPAA/PCI), global residency support, trust reports.

### 3.5 Cross-Cutting Programs

| Theme | Deliverables | Owners | Source |
|-------|--------------|--------|--------|
| **Security & Compliance** | SOC2 packets, STIG checklist, BYOK/HSM roadmap, FedRAMP overlays | Security Eng + Compliance | `docs/SECURITY_ACTION_PLAN.md`, `docs/BYOK_HSM_SECURITY_ROADMAP.md`, `docs/GA_CRITERIA.md` |
| **Evidence & Provenance** | Prov ledger integration, disclosure packager, audit bundles | Prov team | `docs/provenance-export.md`, `disclosure-packager-*` |
| **Reliability** | OTEL stack, chaos drills, SLO matrix | SRE/Platform | `docs/SLOs.md`, `project_management/issues/F1-*.md` |
| **GTM & Pricing** | Pricing model, ROI calculator, GTM assets | GTM Ops | `docs/pricing.md`, `docs/CEO_ONEPAGER_OCT2025.md` |
| **Enablement & Training** | Training ladders, runbooks, UX audits | Enablement | `docs/runbooks/`, `docs/training/`, `docs/COLLAB_REPORT_UX_AI_AUDIT_PLAN.md` |

## 4. GitHub Execution Model

1. **Projects**
   - Create cross-repo project `IntelGraph – GA Q4 2025` (instructions in `docs/github-project-plan.md`).
   - Create companion projects: `Maestro – MVP/GA 2025`, `Conductor – 30/60/90`, `CompanyOS – Org Mesh 2026` using same field schema.
2. **Milestones**
   - IntelGraph: `M0`–`M6` as defined; Maestro: `MVP`, `GA`, `Q1`, `Q2`; Conductor: `30d`, `60d`, `90d`; CompanyOS: `Q0`, `Q1`, `Q2`, `H2`.
3. **Labels & Areas**
   - Extend existing area labels to include `area:maestro`, `area:conductor`, `area:companyos`, `area:security`, `area:gtm`.
   - Use `prio:P0/P1/P2`, `risk:high/med/low`, and track tags `track:A`…`track:F`.
4. **Issue Templates**
   - Reuse issue stubs in `project_management/issues/` and convert to GitHub issues (see Section 6 import CSV).
   - Add template fields: Problem, Deliverable, Exit Criteria, Evidence hooks, Dependencies.
5. **Automation**
   - Configure PR sanitizer `scripts/pr_sanitize.sh` in CI to enforce artifact hygiene.
   - Add GitHub Actions for `project_management/backlog/backlog.json` sync (Export to Issues) and coverage gates (`npm run test`, `npm run lint`).
6. **Dashboards & Docs**
   - Publish weekly status summary to `status/` with snapshot of project metrics.
   - Use `docs/generated/github-roadmap.md` as the living roadmap; update per sprint review.

## 5. Import Packets for GitHub

### 5.1 Issue Import CSV (excerpt)

File: `project_management/import/github-roadmap-issues.csv`

| Title | Body | Labels | Milestone |
|-------|------|--------|-----------|
| IntelGraph: Canonical Schema & Policy Labels | See `project_management/issues/A1-schema-registry.md`. Include acceptance criteria and evidence hooks. | track:A;area:graph;prio:P0 | M1 |
| IntelGraph: Bitemporal Model & Time Travel | From `A2-bitemporal-time-travel.md`. | track:A;area:graph;prio:P0 | M1 |
| ... | ... | ... | ... |

(Full CSV generated alongside this document for bulk import via `gh issue import`.)

### 5.2 Project Items JSON

File: `project_management/import/github-project-items.json` aligns to GitHub Projects v2 API with Status/Area/Priority fields. Each item references the canonical GitHub issue once created.

## 6. Next Actions

1. Run `gh` scripts in `docs/github-project-plan.md` to create IntelGraph project, labels, milestones.
2. Apply same field schema to Maestro/Conductor/CompanyOS projects; link to this roadmap in project description.
3. Import issues using `project_management/import/github-roadmap-issues.csv` (see README in that folder).
4. Update status weekly; ensure evidence artifacts (reports, dashboards, tests) are attached per acceptance criteria.
5. Review and refine roadmap quarterly; update cross-team dependencies and risk mitigations.

---

> Maintainers: Keep this file in sync with sprint reviews and major scope changes. Use PRs tagged `area:roadmap` to update.
