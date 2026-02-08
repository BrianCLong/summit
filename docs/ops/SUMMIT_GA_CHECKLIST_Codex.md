# Summit GA Launch Checklist (Codex Control Room)

**Authority:** Summit Readiness Assertion (governed baseline) and GA governance guardrails.
**Posture:** Evidence-first, reversible, and CI-enforced. Any gap is treated as a **Governed Exception**.

## Codex Control Threads

- **GA CI Monitor**: Monitors CI readiness gates on `main` and isolates GA blockers.
- **Security Evidence Auditor**: Validates evidence completeness across policy, security, and provenance.
- **Ops & Incident Console**: Executes pre-GA, GA-cut, and hypercare operational checklists.

## Codex Desktop Project Definition (Reference)

Use this snippet to configure the **Summit GA Control Room** project in Codex Desktop.

```yaml
project:
  name: "Summit GA Control Room"
  root: "~/code/summit"
  defaultBranch: "main"
  git:
    mode: "read-write"
  safetyProfile:
    allowedCommands:
      - "git status"
      - "git fetch"
      - "git switch"
      - "git pull"
      - "pnpm install"
      - "pnpm test"
      - "pnpm lint"
      - "pnpm playwright"
      - "gh pr status"
      - "gh pr list"
      - "gh pr view"
      - "gh run list"
      - "gh run view"
      - "cosign verify"
      - "opa test"
    forbiddenPatterns:
      - "git push --force"
      - "rm -rf"
      - "psql"
      - "neo4j-admin"
  skills:
    - "ci-observer"
    - "security-evidence-auditor"
    - "release-coordinator"
  incidentMode:
    enabled: true
    git:
      mode: "read-only"
      allowedCommands:
        - "git status"
        - "git fetch"
        - "gh pr view"
        - "gh run view"
    writePolicy:
      branchPrefix: "incident/GA-"
      prLabel: "incident-fix"
```

## Saved Thread Templates

1) **GA CI Monitor** — Detect GA-blocking CI failures and prescribe next actions.
2) **Security Evidence Auditor** — Produce the GA Evidence Delta and map each gap to a PR.
3) **Ops & Incident Console** — Run pre-GA, GA-cut, and hypercare checklists.
4) **GA Launch Checklist Executor** — Execute this checklist and attach evidence artifacts.
5) **Release Gatekeeper** — Validate release readiness gates and rollback posture.

## MAESTRO Alignment

- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Infra, Observability, Security.
- **Threats Considered:** Goal manipulation, prompt injection, tool abuse, evidence tampering, CI bypass.
- **Mitigations:** Evidence-first checklist with deterministic verification, required checks mapped to CI, governed exception tracking, and rollback playbooks enforced via operational runbooks.

## GA Launch Checklist

Each item states the **responsible Codex thread**, the **verification method**, and the **done criteria** for external review.

| # | Checklist Item | Responsible Thread | Verification | Done Criteria |
|---|---|---|---|---|
| 1 | Validate GA readiness baseline against Summit Readiness Assertion. | Ops & Incident Console | Inspect `docs/SUMMIT_READINESS_ASSERTION.md` and `docs/ops/READINESS_INDEX.md`. | Assertion is current; readiness index shows no open GA blockers. |
| 2 | Confirm all required checks on `main` are green (security, tests, release). | GA CI Monitor | Run `gh run list --branch main --limit 20` and inspect `docs/CI_STANDARDS.md`. | No failing workflows blocking GA; CI standards satisfied. |
| 3 | Verify security workflows and policy gates are enforced. | Security Evidence Auditor | Inspect `.github/workflows/ci-security.yml` and `.github/policies/`. | Security workflows are present, required, and aligned to policy baselines. |
| 4 | Confirm evidence bundle completeness for GA compliance. | Security Evidence Auditor | Inspect `evidence/`, `docs/ops/EVIDENCE_INDEX.md`, and `docs/ops/OPS_EVIDENCE_PACK.md`. | Evidence index matches bundle artifacts; gaps are zero or registered as Governed Exceptions. |
| 5 | Validate provenance and disclosure requirements are tracked. | Security Evidence Auditor | Inspect `docs/ops/EVIDENCE_VERIFIER.md` and `COMPLIANCE_EVIDENCE_INDEX.md`. | Provenance evidence recorded and disclosure indices updated. |
| 6 | Verify observability coverage for GA surfaces. | Ops & Incident Console | Inspect `docs/ops/OBSERVABILITY_SIGNALS.md` and `docs/ops/monitoring-guide.md`. | Metrics, logs, and traces are defined for GA-critical services with alert mapping. |
| 7 | Confirm FinOps and cost guardrails are active. | Ops & Incident Console | Inspect `docs/ops/cost-observability.md` and `KPI_BASELINES.yaml`. | Cost guardrails documented; baselines published and current. |
| 8 | Validate release readiness and rollback posture. | Ops & Incident Console | Inspect `docs/ops/release-readiness-dashboard.md` and `docs/ops/ROLLBACK_PLAYBOOK.md`. | Release gates are green; rollback plan is current and testable. |
| 9 | Ensure incident mode is configured and documented. | Ops & Incident Console | Inspect `docs/ops/CODEX_INCIDENT_MODE.md` and `docs/ops/INCIDENT_RESPONSE.md`. | Incident mode runbook exists; escalation path verified. |
| 10 | Confirm GA launch checklist evidence capture is recorded. | Security Evidence Auditor | Inspect `docs/ops/WEEKLY_EVIDENCE_RUNBOOK.md` and `docs/ops/EVIDENCE_INDEX.json`. | Evidence capture schedule includes GA launch run and is recorded. |
| 11 | Validate support readiness and communications. | Ops & Incident Console | Inspect `docs/ops/COMMAND_CENTER_RUNBOOK.md` and `docs/ops/command-console.md`. | Support channels and comms checklist are complete and actionable. |
| 12 | Final GA go/no-go assertion recorded. | Ops & Incident Console | Inspect `GO_NO_GO_GATE.md` and `GO_LIVE_READINESS.md`. | Go/No-Go record is present with signer attribution and timestamp. |

## Operating Procedure (Each Run)

1) Collect raw evidence and logs (UEF-first).
2) Execute relevant thread workflow and capture outputs.
3) Map findings to checklist items, mark Done or Governed Exception.
4) Update evidence indices or add a Governed Exception record.
5) Close with a concise GA readiness summary tied to the Summit Readiness Assertion.

## Completion Protocol

- **Evidence Bundle:** Attach checklist outputs to the evidence index or register a Governed Exception.
- **Decision Ledger:** Record any exceptions and reversal triggers in governance ledgers.
- **Timeline Compression:** Execute checks in a single run window to reduce drift.

**Finality:** GA Launch Checklist execution is complete when every line item is **Done** or registered as a **Governed Exception**.
