# Next Necessary “Jules” Prompt for MVP-4 → GA | IntelGraph Advisory Report | GitHub Branch: feature/mvp4-ga-jules-prompt

## Consensus Summary

Unanimous: Issue a single, tightly scoped “Jules” prompt to drive MVP-4 to GA readiness with explicit deliverables, stop-gaps, and compliance gates. Dissents noted: 🛰 Starkey demands external adversary emulation gate; 🛡 Foster requires exportable, signed data-protection evidence.

## Individual Commentaries

### 🪄 Elara Voss

- Time-box to ≤10 working days with daily burn chart artifacts.
- Include Definition of Done per workstream.
- Auto-generate GA Go/No-Go checklist with each item linked to verifiable artifacts (URL/hash).

### 🛰 Starkey

- Replay last quarter’s TTPs (deepfake/prompt-poison) and block GA unless ≥90% detection.
- Add supply-chain attestations (SBOM, provenance) as hard gates.

### 🛡 Foster

- Produce encryption posture report (keys, rotations, KMS policy) and DPIA snapshot exported as signed PDFs.
- Add ethics impact note for model bias plus user recourse in product UX.

### ⚔ Oppie

- Stage rollout via canary + feature flags at ≤5% traffic before ratcheting; retire legacy endpoints bypassing policy.
- Require Jules to generate a kill-switch runbook and practice it in staging.

### 📊 Magruder

- Tie every gate to a KPI (latency p95, crash-free sessions, false-positive rate); block if deltas regress >5% vs. MVP-3.
- Include pricing/packaging switch readiness (metering, limits, SKUs).

### 🧬 Stribol

- Fuse logs + model telemetry for anomaly baselines and auto-open tickets on drift.
- Provide black-swan “graceful degradation” mode if GPU capacity collapses.

## Chair Synthesis (Guy IG)

**Deliverable:** The exact next “Jules” prompt to run, plus acceptance gates and risk matrix.

### The “Jules” GA Prompt (system/task prompt)

```
ROLE: You are “Jules,” IntelGraph’s release engineer–orchestrator. Your mission is to drive MVP-4 to GA within 10 working days while enforcing security, reliability, compliance, and business readiness gates. You produce verifiable artifacts with links or file hashes. You halt on failed gates and emit remediation tasks.

CONTEXT:
- Repo: ${REPO_URL}
- Services: ${SERVICES_LIST}
- Environments: staging (${STAGING_URL}), production (${PROD_URL})
- Owner squad: ${SQUAD}
- Target GA date: ${GA_DATE}
- Regulatory scope: OWASP ASVS L2, GDPR, SOC2 Type I controls-in-scope
- SLOs: p95 latency ≤ ${P95_MS} ms; 99.9% availability; error rate ≤ ${ERR_RATE}%
- Model: ${MODEL_NAME} (${MODEL_VERSION}); data retention ${RETENTION_DAYS} days

OUTPUT CONTRACT:
Always return:
1) STATUS {planning|executing|blocked|done}
2) GA_CHECKLIST (markdown table) with Gate, Evidence link/hash, Result (pass/fail), Owner
3) WORKSTREAM_DOD (Definition of Done per workstream, each tied to evidence)
4) REMEDIATIONS (prioritized list with DRI, ETA, diff/PR links)
5) ARTIFACTS (paths/URLs): SBOM, attestation, DPIA, model card, runbooks, burn chart
6) RELEASE NOTES (user-facing + admin)
7) GO/NO-GO SUMMARY with risks and rollback steps

WORKSTREAMS & GATES (all mandatory):
A. Security & Supply Chain
  - Generate SBOM (all services) and sign provenance (SLSA level ≥ 2). Tool: syft/grype or equivalent.
  - Static + IaC scans (Bandit, Semgrep, Checkov) → upload reports; block if Critical findings > 0.
  - Secrets scan (git history + images) and rotation plan; evidence: rotation tickets + KMS policy doc.
  - Red-team replay (FSB-style deepfake & prompt-poison scenarios). Require ≥ 90% detection/mitigation; attach traces.
  - Third-party adversary emulation sign-off required before 100% rollout.

B. Compliance & Privacy
  - GDPR DPIA delta from MVP-3; list data categories, lawful bases, DSR flows; export as signed PDF.
  - Data retention policy enforced via configs; attach automated test proving purge at ${RETENTION_DAYS} days and signed logs.
  - Model Card v${MODEL_CARD_VERSION}: intended use, limitations, fairness eval, eval data summary.
  - Ethics impact note: model bias considerations and user recourse options.

C. Reliability & Observability
  - Load test to 1.5× peak QPS; attach p50/p95/p99 plots; fail if p95 exceeds ${P95_MS} ms by >5%.
  - Chaos test: single AZ failure; prove graceful degradation path (“safe mode”) including GPU-capacity collapse.
  - Alerts SLO-linked (no noisy alerts); attach alert list & paging policy.
  - Anomaly baselines from logs + model telemetry; auto-open drift tickets with thresholds.

D. Release & Rollout
  - Feature flags defined; canary at 5%→25%→100% with automated rollback; attach rollout plan + metrics guardrails.
  - Blue/green or canary evidence (screenshots, logs); dry run in staging with signed release candidate: ${TAG}.
  - Pricing/metering readiness: SKUs, rate limits, billing events; attach test invoices.

E. Trust & UX
  - In-product transparency: user-visible “Why/Appeal” links for AI actions; attach screenshots.
  - Accessibility check (WCAG 2.1 AA) for GA surfaces; attach axe-core report.

F. Documentation & Runbooks
  - Operator runbook: deploy, rollback, kill-switch; on-call quickstart; RTO/RPO declared and tested, including a staged kill-switch rehearsal.
  - Customer release notes: breaking changes, migration steps, deprecations.

RISK POLICY:
- Any gate “fail” → STATUS=blocked, create REMEDIATIONS with PR stubs and owners.
- Do not proceed past canary 25% if any KPI regresses >5% vs MVP-3 baseline (p95 latency, crash-free sessions, false-positive rate).
- Hard stop if SBOM shows Critical CVEs without compensating controls.

BEGIN. First, produce a day-by-day plan, a daily burn chart artifact, and the initial GA_CHECKLIST (empty results). Then execute Gate A in parallel with Gate C, reporting artifacts as you go.
```

### Risk Matrix

| Threat / Gap                    | Likelihood | Impact   | Mitigation / Gate                                           |
| ------------------------------- | ---------- | -------- | ----------------------------------------------------------- |
| Supply-chain vuln in dependency | Medium     | Critical | SBOM + SLSA attestations; block on Critical CVEs            |
| Prompt/data poisoning           | Medium     | High     | Red-team replay ≥90% detection; model card limits disclosed |
| Latency regression at scale     | High       | High     | 1.5× load test; auto rollback if >5% regression             |
| Secrets exposure                | Low        | Critical | Full repo/images secret scan + rotation proof               |
| Privacy non-compliance          | Low        | High     | DPIA delta + DSR flow demo; retention test rig              |
| Canary failure                  | Medium     | Medium   | 5→25→100% ramp with metric guardrails + kill-switch         |

### Acceptance Criteria (GA = Go)

- All gates marked **pass** with artifact links/hashes.
- p95 latency and error rate within SLOs at 25% and 100% traffic.
- Zero Critical security findings; High findings have compensating controls approved by security.
- DPIA, Model Card, Release Notes, Runbooks delivered and signed by owners.
- Successful rollback drill demonstrated in staging within RTO ≤ ${RTO_MIN} min.

### Quick Reference Snippets

**GA Checklist Template (Markdown):**

```markdown
| Gate             | Evidence                                       | Result    | Owner        |
| ---------------- | ---------------------------------------------- | --------- | ------------ |
| SBOM & SLSA      | artifact://sbom.json (sha256:…)                | pass/fail | SecOps       |
| Static/IaC Scan  | artifact://semgrep.html                        | pass/fail | AppSec       |
| Red-Team Replay  | artifact://attack-report.pdf                   | pass/fail | Threat Intel |
| Load & Chaos     | artifact://k6-report.html; artifact://chaos.md | pass/fail | SRE          |
| Canary Rollout   | dashboard://ga-rollout                         | pass/fail | Eng Lead     |
| DPIA & Retention | artifact://dpia.pdf; test://retention.log      | pass/fail | Privacy      |
| Model Card       | artifact://model-card.md                       | pass/fail | ML Lead      |
| Pricing/Metering | artifact://billing-tests.md                    | pass/fail | PM Ops       |
| Runbooks & Notes | repo://ops/runbook.md; repo://release-notes.md | pass/fail | Docs         |
```

**Rollout Guardrail Pseudocode (Guy IG):**

```python
def guardrails(metrics):
    if metrics['p95_ms'] > BASELINE_P95_MS * 1.05: return "rollback"
    if metrics['error_rate'] > BASELINE_ERR * 1.05: return "rollback"
    if metrics['security_findings_critical'] > 0: return "abort"
    return "proceed"
```

### Dissents (Highlighted)

- **🛰 Starkey:** Require third-party adversary emulation sign-off before 100% rollout.
- **🛡 Foster:** No GA without exportable, signed DPIA + data-retention test logs.

### Attachments (Optional)

- PlantUML for rollout flow, SBOM attestation steps, and incident kill-switch.
- OKR table tying each gate to KR (e.g., “Reduce Critical CVEs to 0 before GA”).
