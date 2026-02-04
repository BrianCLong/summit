# Summit Agent Readiness++ Runbook

**Status:** Active

## 0) Authority, Alignment, and Readiness Assertion

Summit Readiness++ is governed by the Summit Readiness Assertion and the ecosystem Constitution.
This runbook asserts the present readiness baseline and dictates the future state for autonomous
success at scale. All definitions and scoring map to the authority files listed below; exceptions
are tracked as **Governed Exceptions** with explicit rollback paths.

**Authority files**
- `docs/SUMMIT_READINESS_ASSERTION.md`
- `docs/governance/CONSTITUTION.md`
- `docs/governance/META_GOVERNANCE.md`
- `docs/governance/RULEBOOK.md`
- `agent-contract.json`

## 1) Mission

**Readiness++** subsumes baseline “agent-readiness” by turning criteria checks into a closed-loop
system that measures **Readiness → Reliability → Autonomy ROI** with evidence and determinism.

**Core outputs**
- Maturity level and pillar scores with strict gate thresholds (80% per level, no cherry-pick).
- Evidence bundle (signed, replayable), confidence, and change explanations.
- Autonomy ROI ranking to prioritize remediation by impact and risk reduction.

## 2) Model Overview

### 2.1 Maturity Levels (gated at 80% per level)
1. **Functional**: repo can build and run locally with documented commands.
2. **Documented**: setup, testing, and ownership are explicit; AGENTS.md in place.
3. **Standardized**: repeatable CI/CD and deterministic checks are enforced.
4. **Optimized**: feedback loops are fast; readiness impacts are measured.
5. **Autonomous**: closed-loop improvement; remediation is safe-by-construction.

### 2.2 Pillars (Readiness++ scope)
- Style & Validation
- Build & Packaging
- Testing & Quality Gates
- Documentation & Onboarding
- Dev Environment & Tooling
- Code Quality & Maintainability
- Observability & Debugging
- Security & Governance
- Task Discovery & Scoping
- Product & Experimentation
- Policy & Access Control
- Spec & Intent Infrastructure
- Dependency & Supply-Chain Posture
- Org Process Readiness

## 3) Determinism, Evidence, and Confidence

### 3.1 Two-Track Evaluation
- **Static track (deterministic):** config presence, CI parsing, repo settings, scripts, lockfiles.
- **LLM-assisted track (bounded):** ambiguous docs checks using structured rubrics with
  versioned prompts, multi-run sampling, and confidence intervals.

### 3.2 Evidence Bundle (required for every run)
- Commands executed + logs
- Configs parsed + versions
- CI/test reports + coverage
- SBOM + SLSA attestations
- Policy decisions and OPA evaluations
- Prompt hash + scope bindings

All evidence is signed and anchored to the repo SHA to enable replay and audit.

## 4) Readiness++ Criteria (First 20)

| ID | Pillar | Criterion | Level Gate | Evidence |
| --- | --- | --- | --- | --- |
| R1 | Documentation | `AGENTS.md` present at repo root and scoped subtrees. | L2 | File scan + scope map |
| R2 | Documentation | Setup commands succeed locally (`pnpm install`, `pnpm dev`). | L1 | Command logs |
| R3 | Build | CI config exists and is parsable (`.github/workflows/`). | L2 | Parsed workflow JSON |
| R4 | Testing | Unit test command defined and runnable (`pnpm test:unit`). | L2 | Test logs |
| R5 | Testing | Coverage threshold defined for touched packages. | L3 | Config + coverage report |
| R6 | Dev Env | `.env.example` present; secrets not tracked. | L1 | File scan |
| R7 | Code Quality | Lint command defined and enforced (`pnpm lint`). | L2 | Lint logs |
| R8 | Code Quality | Format check enforced (`pnpm format:check`). | L3 | Format logs |
| R9 | Security | Dependency scanning configured (e.g., `gitleaks`, `trivy`). | L3 | Config scan |
| R10 | Observability | OpenTelemetry/metrics hooks documented and active. | L3 | Docs + config |
| R11 | Task Discovery | Issue templates or intake process defined. | L2 | Template scan |
| R12 | Governance | CODEOWNERS present and non-empty. | L2 | File scan |
| R13 | Policy & Access | OPA/authorization policy references are documented. | L3 | Policy map |
| R14 | Spec & Intent | Acceptance criteria or contracts in repo (e.g., ADR/runbooks). | L3 | Doc scan |
| R15 | Supply Chain | Lockfiles present and aligned with package manager. | L2 | Lockfile scan |
| R16 | Org Process | PR template includes verification checklist. | L2 | Template scan |
| R17 | Reliability | Smoke test command defined (`make smoke`). | L3 | Makefile scan |
| R18 | Determinism | Prompt hash registry present (`prompts/registry.yaml`). | L4 | File scan |
| R19 | Evidence | CI emits artifacts for tests/coverage. | L4 | Workflow artifact scan |
| R20 | Autonomy ROI | Baseline agent outcome metrics tracked. | L4 | Metrics registry |

**Scoring rule:** readiness score = min-level gate passed for each level, with 80% pass threshold;
no level advancement without the prior level passing.

## 5) Remediation Plan (Safe-by-Construction)

### 5.1 PR Blueprint (every auto-fix)
- **Why:** failed criteria → expected reliability gain + autonomy ROI
- **What:** minimal, pinned diff with governed exceptions if needed
- **How verified:** commands executed + evidence bundle IDs
- **Rollback:** explicit reversal steps, DecisionLedger entry, and owner mapping

### 5.2 Policy Gates
- OPA-enforced approvals for security/infra changes
- CODEOWNERS mandatory approvals
- Risk-based merge thresholds tied to readiness drop deltas

### 5.3 Rollback and Decision Reversibility
All autonomous remediation decisions are recorded in the DecisionLedger with a rollback path and
artifact references.

## 6) Implementation Surfaces

1. **CLI**: `summit readiness` (local + CI mode)
2. **PR Gate**: readiness check-run + comment summary, blocks when thresholds drop
3. **Org Dashboard**: maturity distribution + top Autonomy ROI fixes
4. **Auto-Remediation PRs**: foundational gaps → risk-scored improvements

## 7) AGENTS.md Layout Standard

- **Root `AGENTS.md`**: global rules, command matrix, governance references, testing gates.
- **Package `AGENTS.md`**: localized commands, ownership, and boundaries.
- **Drift checks**: CI validates commands and versions declared in AGENTS.md.

## 8) MAESTRO Security Alignment

- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Infra, Observability, Security
- **Threats Considered:** prompt injection, tool abuse, supply-chain compromise, goal manipulation,
  evidence tampering, CI artifact spoofing
- **Mitigations:** signed evidence bundles, prompt hash pinning, least-privilege execution,
  OPA policy gates, artifact retention with checksum validation, CI provenance attestations

## 9) Execution Checklist

- Confirm readiness gate thresholds for current release.
- Run readiness evaluation (static + LLM-assisted) with evidence capture.
- Publish readiness report + autonomy ROI backlog.
- Trigger auto-remediation for Tier-0 gaps.
- Record decisions + rollback steps in DecisionLedger.

---

**End state:** Readiness is measurable, reliability is enforceable, autonomy ROI is optimized with
verifiable evidence.
