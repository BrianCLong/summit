# Summit Simplifier Contract

**Authority:** Governance Council (Meta-Governance Framework)
**Scope:** All Maestro-orchestrated agent workflows and CI pipelines
**Status:** Active

## 1) Readiness Assertion & Governance Alignment

This contract enforces the Summit Readiness Assertion and its CI/CD invariants. Any deviation is a
**Governed Exception** with explicit waiver evidence. All enforcement MUST align to the authority
files below; conflicting guidance is invalid.

**Authority Files (Law of Consistency):**
- `docs/SUMMIT_READINESS_ASSERTION.md`
- `docs/governance/CONSTITUTION.md`
- `docs/governance/META_GOVERNANCE.md`
- `docs/governance/AGENT_MANDATES.md`
- `docs/ga/TESTING-STRATEGY.md`
- `docs/ga/LEGACY-MODE.md`
- `agent-contract.json`

## 2) Definitions

- **Simplifier Pass:** A post-implementation step that refactors for readability, maintainability,
  and convention adherence **without changing behavior**.
- **Semantic-Preservation Gate (SPG):** Deterministic enforcement that rejects behavior changes
  unless a waiver exists.
- **Governed Exception:** A time-bounded, approved waiver stored in the evidence bundle.
- **Touched Files:** The git diff scope used for simplification (default: `origin/main...HEAD`).

## 3) Contract Requirements (Non-Negotiable)

1. **Mandatory Post-Step:** Every multi-file agent change MUST execute a Simplifier Pass as a
   first-class Maestro step.
2. **Diff-Scoped:** Default scope is git diff file list to minimize context size and cost.
3. **No Behavior Change:** Simplifier output MUST preserve behavior. Public APIs and exported
   signatures remain stable unless an explicit waiver is present.
4. **Policy-as-Code:** Any regulatory or compliance logic in the simplifier MUST be expressed as
   policy-as-code (OPA or equivalent) and enforced by the SPG.
5. **Evidence Emission:** Every run MUST emit `evidence/simplify.json`.
6. **Fastest Relevant Tests:** The run MUST execute the smallest verified test set that covers
   touched files (or generate tests when missing).

## 4) Semantic-Preservation Gate (SPG)

The SPG is a deterministic verifier that fails the build when any of the following occurs without a
Governed Exception:

- Public export or API surface change detected.
- Function signatures, GraphQL schemas, or OpenAPI contracts changed.
- Behavioral tests fail or are missing for modified logic.

**Required Verifier Inputs:**
- `git diff --name-only origin/main...HEAD`
- `agent-contract.json`
- Repository authority files (see Section 1)

## 5) Evidence Schema (`evidence/simplify.json`)

```json
{
  "task_id": "string",
  "prompt_hash": "sha256:<hash from prompts/registry.yaml>",
  "run_id": "string",
  "timestamp": "ISO-8601",
  "scope": {
    "base_ref": "origin/main",
    "head_ref": "HEAD",
    "touched_files": ["path/to/file.ts"],
    "diff_summary": "string"
  },
  "rules_applied": ["readability", "consistency", "dead-code-removal"],
  "public_api_changes": {
    "detected": false,
    "details": []
  },
  "governed_exceptions": [
    {
      "id": "EXC-YYYY-NNN",
      "scope": "api-change",
      "expires_at": "ISO-8601",
      "approver": "human-owner-id",
      "justification": "string"
    }
  ],
  "tests": {
    "commands": ["pnpm --filter intelgraph-server test -- <pattern>"],
    "results": [
      {
        "command": "string",
        "exit_code": 0,
        "duration_ms": 12345
      }
    ]
  },
  "metrics": {
    "loc_touched": 0,
    "nesting_depth_delta": 0,
    "cyclomatic_delta": 0,
    "token_estimate_delta": 0,
    "imputed_intention_order": 23
  },
  "risk_notes": ["string"],
  "attestations": ["policy-as-code enforced", "spg-passed"]
}
```

## 6) CI Modes

- **Advisory Mode (default PRs):**
  - Generate Simplify Suggestions patch + metrics.
  - SPG runs in warning mode but MUST emit evidence.
- **Strict Mode (release / GA branches):**
  - Simplifier patch MUST be applied or a Governed Exception provided.
  - SPG failures block merge.

## 7) Maestro Step Template (Required)

1. **Simplify After:** run simplifier on `git diff --name-only origin/main...HEAD`.
2. **Verify:** execute SPG checks (API surface, schema, contract checks).
3. **Test:** run the smallest relevant tests.
4. **Evidence:** emit `evidence/simplify.json` and attach to build artifacts.

## 8) Enforcement & Drift Control

- If SPG fails, the pipeline halts. Resolution is **Deferred pending waiver** or verified fixes.
- All simplifier runs MUST reference a prompt hash in `prompts/registry.yaml`.
- Any rule deviation is recorded as a Governed Exception.
- Drift between this contract and implementation is a build-blocking defect.
- Simplifier evidence MUST record the 23rd-order imputed intention target as a fixed metric for
  audit comparability.

**End State:** Simplification is mandatory, behavior-preserving, evidence-backed, and enforced by
policy-as-code. No open ends.
