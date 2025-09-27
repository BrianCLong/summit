# PRD — Maestro (Intelgraph Build Conductor)

**Document status:** Draft v1.0  
**Authors/Owners:** Platform PM; Eng Lead — Orchestration; Security; SRE; DevEx  
**Last updated:** 2025‑09‑01

> **Positioning (must‑read):** **Maestro is a standalone orchestration service that builds Intelgraph.** It is **separate from Intelgraph** (distinct repo, release cadence, and SLOs). Maestro acts as the **conductor** that coordinates LLMs (via **litellm**/**Ollama**), web scraping, APIs, IDE/CLI actions, CI/CD systems, and build automation to plan, generate, test, package, sign, and ship Intelgraph artifacts.

---

## 1) Problem & Opportunity

Intelgraph requires a reliable, auditable, and cost‑aware **build conductor** that can:

- Automate complex build/test/release pipelines spanning LLM code generation, scraping contextual docs, API integrations, and conventional build/cd tasks.
- Enforce **policy‑by‑default** (RBAC/ABAC, OPA, supply‑chain controls) while giving developers a **first‑class DevEx** via CLI/IDE/CI adapters.
- Provide **end‑to‑end visibility** (traces, metrics, budgets) and **resume safely** after failures.

**Opportunity:** Centralize and standardize the build supply chain so Intelgraph teams ship faster with **lower risk and predictable cost**.

---

## 2) Goals & Non‑Goals

### Goals (P0 unless marked otherwise)

1. Execute **DAG‑based build pipelines** with reliable replay, retries, and idempotency.
2. Integrate with **litellm** and **Ollama** for planning/generation steps, with safety filters and cost accounting.
3. Provide **web scraping** and **OpenAPI‑driven** API steps with compliance guardrails.
4. Offer **IDE (VS Code)**, **CLI**, and **CI/CD** adapters for seamless developer workflows.
5. Enforce **security & compliance** (RBAC/ABAC, OPA, secrets hygiene, signing, SBOM, provenance).
6. Deliver **observability & cost guardrails** (OTEL traces, metrics, per‑run budget controls).
7. Ship **reference templates** and a golden **Intelgraph build pipeline**.

### Non‑Goals

- Running Intelgraph in production (runtime ownership).
- Owning Intelgraph business logic or product UX.
- Providing general web crawling at scale beyond build‑context scraping.

---

## 3) Success Metrics / OKRs

- **O1:** Reduce median build time by **30%** while keeping failure rate ≤ **1%**.
- **O2:** Achieve **99.9%** control‑plane availability; time‑to‑resume after worker crash ≤ **60s**.
- **O3:** Keep LLM spend within **budget caps** per run/tenant; **100%** of LLM/API calls traced with cost attribution.
- **O4:** **0 Critical/High** vulns at release; **100%** artifacts signed with SBOM + provenance.
- **O5:** **DX** satisfaction (DevEx NPS) ≥ **+40** by end of GA quarter.

---

## 4) Users & Personas

- **Build Engineers (primary):** maintain pipelines/templates; need policy and reproducibility.
- **Product Developers:** trigger pipelines from IDE/PR; want fast feedback and clear failures.
- **Release Managers:** gate promotions; need audit, approvals, compliance evidence.
- **SRE/SecOps:** operate Maestro; require observability, SLOs, and incident playbooks.

---

## 5) Scope & Requirements

### 5.1 Functional Requirements (FR)

**FR‑1 DAG Engine**

- Define pipelines via **Template DSL** (YAML/JSON) with schema/lint.
- Support fan‑out/fan‑in, conditionals, loops (bounded), timeouts, budgets.
- Exactly‑once semantics: step cursors, idempotency keys, dedup, replay.

**FR‑2 Integrations**

- **litellm:** provider routing, retries/limits, cost & token telemetry, prompt/response redaction, safety filters.
- **Ollama:** pool health, model pre‑warm, streaming tokens, GPU/CPU affinity controls, catalog & pinning.
- **Web Scraping:** headless browser steps, robots/rate compliance, allowlist domains, extraction to structured docs, cache/dedupe.
- **API/OpenAPI:** import spec → typed client; OAuth2/JWT/API key auth; pagination/retry helpers; idempotency tokens.
- **IDE (VS Code):** start/run, approve, view logs/traces; template lint; inline surfacing of failed steps.
- **CLI:** `run`, `status`, `logs`, `watch`, `cancel`, `approve`, `template lint`, profiles & OIDC/PKCE auth.
- **CI/CD:** GitHub Actions/GitLab templates; event webhooks (PR, tag, release); promotion gates; artifact handoff.

**FR‑3 Security & Governance**

- RBAC/ABAC with project/namespace scopes; step‑up approvals.
- OPA policy engine for step allow/deny, egress, secrets access, license/vuln thresholds.
- Secrets via Vault/KMS; short‑lived tokens; no secrets in logs; egress controls per step.
- Supply‑chain: SBOM, vulnerability scanning, **Cosign** signing, **SLSA** provenance.

**FR‑4 Observability & Cost**

- OTEL traces (run→step→external calls), structured logs with correlation IDs.
- Metrics: success rate, latency, queue depth, LLM/token costs, API spend.
- Alerts: error budget burn, stuck runs, cost spikes; usage reports per tenant.

**FR‑5 Reliability**

- HA scheduler/queue, worker autoscaling, graceful drains, resume on crash.
- DLQ with replay; retry taxonomy with backoff/jitter.
- Multi‑tenant quotas/limits.

**FR‑6 DevEx**

- Starter templates/wizards; golden Intelgraph pipeline.
- Docs & quickstarts; examples for each integration.

### 5.2 Non‑Functional Requirements (NFR)

- **Availability:** Control plane **99.9%**; data plane workers autoscale.
- **Latency:** P95 run latency per golden pipeline meets documented SLA.
- **Scalability:** ≥ **1k concurrent runs**, ≥ **100k steps/day**.
- **Security:** No Critical/High image vulns; CIS‑aligned hardening; pen‑test sign‑off.
- **Compliance:** Scraping data retention policies; audit trails (who/what/why) for approvals.

### 5.3 Out‑of‑Scope

- Managing Intelgraph production runtime.
- Non‑build LLM agent features not tied to build pipelines.

---

## 6) Architecture Overview

**Control Plane**: API/Gateway, Scheduler/Queue, Policy (OPA), State Store, Templates Registry, Cost Manager, Observability.  
**Data Plane**: Isolated workers (containers) running step plugins; network egress controls; artifact store & registry.  
**Interfaces**: REST/GraphQL, Webhooks, CLI, VS Code extension, CI actions.

> **Separation Statement:** Maestro interacts with Intelgraph **only** via Git, artifact registries, and deployment gates. No Intelgraph internals are embedded.

---

## 7) API & DSL (first cut)

### 7.1 REST/GraphQL

- `POST /runs` — start run (template, params, budget).
- `GET /runs/{id}` — status, timeline, costs.
- `POST /runs/{id}:cancel|:approve|:retry` — control.
- `GET /templates` — list & versions; `POST /templates` — publish.

### 7.2 Pipeline Template DSL (excerpt)

```yaml
name: intelgraph-build
on: [push, pr]
params:
  env: { type: string, enum: [staging, prod], default: staging }
steps:
  - id: plan
    uses: llm.plan
    with:
      provider: litellm
      model: gpt-4o
      prompt: "Summarize diff and propose test matrix"
      budget_tokens: 20000
  - id: scrape-docs
    uses: web.scrape
    with: { urls: ["https://docs.example.com"], mode: headless, cache_ttl: 86400 }
  - id: gen
    uses: llm.generate
    with: { provider: litellm, context_from: [plan, scrape-docs], output: diff.patch }
  - id: build
    uses: build.container
    with: { dockerfile: ./Dockerfile, cache: true, sbom: true }
  - id: scan
    uses: security.scan
    with: { threshold: high }
  - id: sign
    uses: supplychain.sign
    with: { provider: cosign }
  - id: publish
    uses: registry.push
    with: { image: "ghcr.io/org/intelgraph:${{ git.sha }}" }
  - id: deploy
    uses: cd.rollout
    with: { env: ${{ params.env }}, strategy: canary }
```

---

## 8) Dependencies & Assumptions

- Vault/KMS available; container registry & object store available.
- GitHub/GitLab for SCM/CI; company SSO with OIDC/PKCE.
- Ollama hosts with GPU capacity; litellm providers configured with quotas.

---

## 9) Security, Privacy, Compliance

- RBAC/ABAC; step‑up auth for privileged actions; approval reason capture.
- OPA policies for network egress (allowlists), secrets, artifact gates.
- PII/data retention for scraped data; deletion workflows.
- Signing (Cosign), SBOM (Syft), provenance (SLSA L3 target at GA).
- Pen‑test before GA; threat model doc with mitigations.

---

## 10) Observability & Cost Controls

- OTEL tracing; Prom metrics; dashboards for latency, success rate, queue depth, spend.
- Budgets per run/tenant with soft/hard caps; circuit breakers; denial reasons.

---

## 11) Rollout Plan

**Alpha (4–6 weeks):** DAG v1, litellm+Ollama core, CLI/Actions MVP, basic tracing, single‑tenant.  
**Beta (4–6 weeks):** OPA policies, scraping + API adapters, VS Code extension, signing/SBOM, HA scheduler.  
**GA (4 weeks):** Multi‑tenant quotas, full docs & runbooks, SLOs, pen‑test sign‑off, billing/usage reports.

---

## 12) Release Criteria (Ship Gates)

1. All **P0 FR/NFR** met;
2. 100 consecutive **kill‑and‑resume** E2E runs pass;
3. **0 Critical/High** vulns;
4. SLO dashboards live; on‑call playbooks tested;
5. **Golden Intelgraph pipeline** published and reproducible.

---

## 13) Risks & Mitigations

- **LLM variability / prompt injection:** strong input/output filters, allowlists, human‑in‑the‑loop for high‑risk steps.
- **Scraping legal risk:** domain allowlists, robots compliance, retention controls.
- **Cost overruns:** per‑step/run budgets, circuit breakers, spend alerts.
- **Vendor/API drift:** OpenAPI‑first adapters, contract tests, version pinning.
- **Capacity hot spots (Ollama GPUs):** pre‑warm pools, autoscale, work‑conserving queues.

---

## 14) Testing Strategy

- Unit/contract tests for steps/adapters;
- E2E golden flows: plan→gen→test→build→scan→sign→publish→deploy;
- Chaos (worker kill, net partitions), soak (24–72h), load (≥1k concurrent runs);
- Security regression suite (secrets, policies, signing).

---

## 15) DevEx Artifacts

- Starter templates repo; example Actions/Jobs; sample VS Code extension panel; CLI quickstart.
- How‑to guides: “Add a new step,” “Budget a pipeline,” “Approve a gate,” “Investigate a failed run.”

---

## 16) RACI

- **Scope/PM:** Platform PM (A), Eng Lead (R), Sec (C), SRE (C), DX (C)
- **Architecture:** Eng Lead (A), Principal Eng (R), SRE (C)
- **Security/Compliance:** Security (A), Eng Lead (R)
- **Delivery/Ops:** SRE (A), Eng Lead (R), DX (C)

---

## 17) Backlog Snapshot (P0 slice)

- DAG engine v1 with state/retries/idempotency; Template DSL + linter.
- litellm & Ollama adapters with tracing/cost; safety & redaction.
- Web scraping adapter with compliance guardrails; API/OpenAPI adapter.
- CLI + GitHub Actions integration; basic VS Code panel.
- RBAC/OPA; secrets + egress controls; SBOM/signing/provenance.
- OTEL + metrics + dashboards; budgets & circuit breakers.

---

## 18) Appendices

### A) Canonical README badge copy

> **Maestro builds Intelgraph.** Standalone orchestration service integrating LLMs (litellm/Ollama), web scraping, APIs, IDE/CLI, CI/CD, and build automation. Maestro is not Intelgraph; it operates _on_ Intelgraph repos and environments via well‑defined interfaces.

### B) CLI Commands (v1)

```
maestro run --template intelgraph-build --param env=staging --budget 5usd
maestro status <run-id>
maestro logs <run-id> --step gen
maestro cancel <run-id>
maestro approve <run-id> --gate security
maestro template lint ./maestro.pipeline.yaml
```

### C) OPA Policy Examples (sketch)

- Deny network egress to non‑allowlisted domains;
- Require approval for `deploy` step to `prod`;
- Deny artifact publish if vuln score > threshold.

### D) Data Model (high‑level)

- **Run(id, template, params, status, costs, created_at, …)**
- **Step(id, run_id, type, inputs, outputs, logs_ref, status, retries, cost)**
- **Template(id, version, schema, signature, owner)**
- **Policy(id, type, rules, version)**
