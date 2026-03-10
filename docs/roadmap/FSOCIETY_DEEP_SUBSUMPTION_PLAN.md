# fsociety Deep Subsumption Plan (Governed, Defensive, Evidence-First)

## 1) Item Identification

- **Item:** `umeshshinde19/fsociety`
- **Type:** Public GitHub repository (Python + shell scripts)
- **Observed positioning:** Menu-driven penetration-testing toolkit / launcher pattern.
- **Summit position:** Subsumption by governance and deterministic evidence, **not** offensive tooling replication.

## 2) Ground-Truth Claims Captured From Item Description

- Public description frames fsociety as a penetration testing framework / hacking tools pack.
- Public taxonomy includes categories such as information gathering, password attacks, wireless testing, exploitation, sniffing/spoofing, web hacking, and post exploitation.
- Public examples include tools such as `nmap`, `sqlmap`, `XSStrike`, `Arachni`, `Reaver`, and `Ncrack`.
- Public file layout commonly references launcher/update/config artifacts (`fsociety.py`, `install.sh`, `update.sh`, `docker-compose.yml`, `fsociety.cfg`).

## 3) Subsumption Direction for Summit

Summit subsumes the reusable pattern as a **Security Tool Governance Layer**:

- Tool descriptor registry (metadata, not exploit content)
- Deny-by-default policy gate for execution eligibility
- Deterministic evidence artifacts (`report.json`, `metrics.json`, `stamp.json`)
- Drift detection for descriptor/policy divergence
- Runbook and data-handling controls for operational readiness

## 4) Minimal Winning Slice (MWS)

**MWS sentence:**
Summit can register external security-tool metadata as governed descriptors, refuse unapproved execution, and emit deterministic evidence for every decision.

### MWS acceptance tests

- `pnpm test -- --runInBand __tests__/absorption/fsociety-governance/catalog.spec.ts`
- `pnpm test -- --runInBand __tests__/absorption/fsociety-governance/policy.spec.ts`
- `python3 .ci/evidence_validate.py artifacts/fsociety-governance/report.json`
- `bash .ci/verify_evidence.sh`

### Required artifacts

- `artifacts/fsociety-governance/report.json`
- `artifacts/fsociety-governance/metrics.json`
- `artifacts/fsociety-governance/stamp.json`

## 5) Architecture Subsumption Mapping

- `tool menu` → `tool descriptor registry`
- `launcher shell` → `policy-gated execution orchestrator`
- `category menu` → `safe taxonomy with forbidden mappings`
- `stdout-only output` → `structured evidence artifacts`

### Proposed module shape

```text
absorption/fsociety-governance/
  README.md
  tool-catalog.schema.json
  tool-catalog.seed.yaml
  claim-registry.json
  report.template.json
```

## 6) Security, Threats, and Guardrails

### MAESTRO Layers

- Foundation
- Data
- Agents
- Tools
- Observability
- Security

### Threats considered

- Unapproved external tool execution
- Taxonomy leakage from offensive categories into allowed runtime paths
- Sensitive data leakage in evidence/logs
- Drift between approved descriptors and execution adapters

### Mitigations

- Deny-by-default policy (`approved`, `execution_mode=governed`, non-forbidden category)
- Descriptor schema validation + provenance checks
- Redaction / never-log rules for targets, credentials, and tokens
- Scheduled drift detector with explicit alerts and governance escalation

## 7) Data Handling Contract (Defensive)

Never log:

- target IP addresses / hostnames
- authentication tokens / session cookies
- discovered credentials or secrets
- exploit payloads

Retention defaults:

- `report.json`: 30 days (unless policy overrides)
- `metrics.json`: 90 days
- `stamp.json`: indefinite provenance retention

## 8) PR Stack (Max 5)

1. `feat(absorption): add fsociety-governance catalog skeleton`
2. `feat(policy): deny unapproved external tool execution`
3. `feat(evidence): emit deterministic fsociety-governance artifacts`
4. `feat(monitoring): add fsociety-governance drift detector`
5. `docs(governance): add standards, runbooks, and data handling`

## 9) Definition of Done

- Determinism: 5/5
- Machine verifiability: 5/5
- Mergeability: 5/5
- Security posture: 5/5
- Measured advantage: 4/5+

**Pass threshold:** >= 20/25.

## 10) Finality Statement

This plan intentionally constrains scope to defensive governance, evidence integrity, and policy enforcement. Offensive replication of fsociety behavior is excluded by design and deferred pending explicit governance approval.
