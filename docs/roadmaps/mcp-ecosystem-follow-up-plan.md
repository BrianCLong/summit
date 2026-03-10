# Summit MCP Ecosystem Follow-Up Plan (Repo-Tightened)

## Final Objective

Evolve Summit from point MCP integrations into a governed MCP ecosystem with:

- private registry semantics,
- policy-aware discovery,
- multi-agent orchestration,
- remote-client compatible gateway behavior,
- deterministic evidence and drift control.

This plan is constrained to **existing repo surfaces** validated in `docs/repo/repo_assumptions.md`.

## Architecture Delta (Additive Only)

```text
AI Hosts / OpenAI Responses / ChatGPT Connectors / Internal Agents
                             |
                             v
                 server/src/mcp-gateway/*
                             |
                +------------+------------+
                |                         |
                v                         v
      mcp/summit_server/*      server/src/conductor/mcp/*
                |                         |
                +------------+------------+
                             v
                   Summit APIs + GraphRAG + Ingestion
```

## Phased PR Stack (5 PR hard limit)

### PR1 — Registry Normalization on Existing Surfaces

**Commit:** `feat(mcp): normalize summit tool registry metadata on existing server surfaces`

**Scope:**

- Extend `mcp/summit_server/src/tools/tool-registry.ts` for deterministic metadata export.
- Add snapshot emitter aligned with existing evidence layout.
- Keep deny-by-default via `mcp/allowlist.yaml`.

**Checks:**

- `node scripts/ci/validate_mcp_contract.mjs`
- `python tools/ci/verify_mcp_deny_by_default.py`

---

### PR2 — Policy-Aware Discovery + Tenant Filtering

**Commit:** `feat(mcp): add policy-filtered tool discovery with tenant visibility controls`

**Scope:**

- Integrate discovery filtering in `server/src/mcp-gateway/policy.ts` and/or `server/src/conductor/mcp/client.ts`.
- Enforce capability/risk tags using existing policy files:
  - `policies/security/mcp_governance.rego`
  - `policies/capability-fabric/mcp-invoke.rego`

**Checks:**

- existing policy workflows (`policy-validate.yml`, `governance-policy` checks if configured)
- `node scripts/ci/verify_mcp_only_tools.mjs`

---

### PR3 — Deterministic Multi-Agent Execution Trace

**Commit:** `feat(mcp): add deterministic planner-executor trace artifacts for orchestrated tool runs`

**Scope:**

- Extend `server/src/conductor/mcp/orchestrator.ts` and related tests.
- Emit evidence artifacts under `reports/mcp/` (deterministic JSON ordering).
- Add budget/step guardrails via `packages/policy/src/mcp_budget.ts` integration.

**Checks:**

- `pnpm test -- server/src/conductor/mcp/__tests__/orchestrator.test.ts`
- `pnpm test -- tests/mcp/server.contract.test.ts`

---

### PR4 — Remote-Compatible Gateway Hardening

**Commit:** `feat(mcp): harden gateway authz, audit, and remote-mcp interoperability surface`

**Scope:**

- Extend `server/src/mcp-gateway/index.ts`, `audit.ts`, `policy.ts`.
- Add strict authn/authz envelope and per-tenant deny reasons.
- Preserve backwards compatibility for existing MCP clients.

**Checks:**

- `pnpm test -- server/src/maestro/mcp/__tests__/sessions-invoke.test.ts`
- `pnpm test -- tests/mcp/sse.test.ts`

---

### PR5 — Drift + SLO + Operational Readiness

**Commit:** `feat(mcp): add ecosystem drift and slo evidence pack for daily readiness`

**Scope:**

- Enhance `scripts/monitoring/mcp-apps-drift.mjs` coverage for schema/policy/latency drift.
- Align with `.github/workflows/mcp-drift.yml` and `slo-smoke-gate.yml`.
- Publish deterministic `report.json`, `metrics.json`, `stamp.json` in `reports/mcp/`.

**Checks:**

- `node scripts/monitoring/mcp-apps-drift.mjs`
- `node scripts/k6/mcp_slo.js` (or workflow equivalent)

## Acceptance Criteria

1. Tool discovery returns only allowlisted + policy-permitted tools.
2. Denied calls return structured policy denial with stable evidence IDs.
3. Two-step orchestrated flow succeeds with deterministic `plan/report/metrics` artifacts.
4. Drift monitor catches schema or policy regressions.
5. SLO smoke validates MCP latency budget gates.

## Governance & Threat Alignment

- **MAESTRO Layers:** Agents, Tools, Observability, Security.
- **Threats considered:** prompt injection, tool abuse, cross-tenant exfiltration, schema smuggling.
- **Mitigations:** deny-by-default allowlist, Rego policy gate, deterministic schemas, auditable evidence bundles.

## Rollback Protocol

- Keep all new behavior behind flags/default-off where runtime-sensitive.
- Revert per-PR; no shared migration dependency until PR3 merges green.
- If policy drift emerges, freeze discovery to allowlist-only mode.

## Confidence

- **Confidence score:** 0.83
- **Basis:** target surfaces and checks are already present in-repo, minimizing platform-introduction risk.
