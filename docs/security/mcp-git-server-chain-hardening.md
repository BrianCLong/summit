# MCP Git Server Chain Hardening — Exploit Extraction & Summit Controls

Anchored to the Summit Readiness Assertion for immediate enforcement posture.
(See `docs/SUMMIT_READINESS_ASSERTION.md`.)

## 1. Exploit & Failure Taxonomy

- **THREAT_CLASS:** Path traversal / workspace escape
  - **ATTACK_PRIMITIVE:** Path validation bypass on repository roots
  - **EXPLOIT_CHAIN:** Untrusted repo path → escape workspace → enumerate or read arbitrary files
  - **IMPACT_SURFACE:** Local filesystem, build artifacts, secrets, agent context stores
- **THREAT_CLASS:** Unauthorized initialization / resource creation
  - **ATTACK_PRIMITIVE:** Unrestricted git_init across filesystem
  - **EXPLOIT_CHAIN:** Prompt-injected tool call → repo init outside workspace → persistence foothold
  - **IMPACT_SURFACE:** Host filesystem integrity, configuration drift, evidence chain
- **THREAT_CLASS:** Argument injection / parameter smuggling
  - **ATTACK_PRIMITIVE:** Unsanitized git_diff/git_checkout args
  - **EXPLOIT_CHAIN:** Crafted args → file overwrite/tamper → integrity loss → execution pivot
  - **IMPACT_SURFACE:** Source tree, CI artifacts, runtime scripts
- **THREAT_CLASS:** Cross-tool composability escalation
  - **ATTACK_PRIMITIVE:** Prompt injection + tool chaining (Git MCP + FS MCP)
  - **EXPLOIT_CHAIN:** Read poison → tool invocation → write outside scope → RCE/defacement
  - **IMPACT_SURFACE:** Agent runtime, CI workers, target repo, evidence ledger

## 2. Agent-System Design Laws

- **Workspace boundaries are inviolable**; tool interfaces must enforce path confinement at the
  boundary (no indirect or inferred roots).
- **Intent validation is mandatory at each tool hop**; tool chains do not inherit trust.
- **Argument normalization is a security boundary**; reject any argument not expressed in an
  allowlisted, deterministic schema.
- **Composability amplifies blast radius**; chained tools must carry taint and evidence metadata.
- **Governed Exceptions only**; any legacy bypass is reclassified as a Governed Exception with
  explicit evidence, rollback, and expiry.

## 3. Summit Control Mapping

- **MAESTRO Layers:** Foundation, Tools, Observability, Security
- **Threats Considered:** prompt injection, goal manipulation, tool argument injection, workspace
  escape, cross-tool privilege escalation
- **Mitigations:** deterministic arg schemas, workspace confinement, taint tracking, audit ledger
  writes, fail-closed policy gates

| Control                      | Summit-native enforcement                           | File path / surface                                             | Evidence artifact                     |
| ---------------------------- | --------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------- |
| Workspace confinement        | Normalize + reject non-rooted paths; deny traversal | `scripts/ci/registry_audit_gate.mjs`, `docs/REPO_BOUNDARIES.md` | `report.json` (CI gate)               |
| Tool capability manifests    | Explicit allowlists per tool; no implicit elevation | `governance/tool_registry.yaml`                                 | `stamp.json`                          |
| Deterministic arg validation | JSON schema + allowlist per tool                    | `agents/task-spec.schema.json`                                  | `metrics.json`                        |
| Cross-tool taint tracking    | Carry provenance tags between Git/FS actions        | `docs/provenance-ledger-beta-implementation.md`                 | `artifacts/agent-runs/{task_id}.json` |
| Evidence-ID linkage          | Evidence ID per tool execution                      | `docs/GA_CONTROL_EVIDENCE_BUNDLE.md`                            | Evidence bundle                       |

## 4. CI / Runtime Enforcement

- **Fail-closed checks:**
  - Verify MCP tool versions ≥ `2025.12.18` before any agent run.
  - Validate git tool arguments against allowlisted schemas.
  - Block any repo path that resolves outside the workspace.
- **Runtime assertions:**
  - Deny `git_init` outside configured workspace root.
  - Deny `git_checkout` / `git_diff` with any non-canonical arg ordering.
- **Required outputs:**
  - `report.json` for tool/version attestation
  - `metrics.json` for enforcement counters
  - `stamp.json` for policy hash
- **Auditability:**
  - All enforcement failures emit DecisionLedger entries with rollback steps.

## 5. Governance & Evidence Artifacts

- **Policy-as-code rule:** enforce a version gate (`>= 2025.12.18`) for `mcp-server-git`.
- **Evidence bundle updates:** include regression logs for file access and RCE simulations.
- **Decision reversibility:** record decisions and rollback path in DecisionLedger.
- **Prompt integrity:** validate prompt hash alignment via `scripts/ci/verify-prompt-integrity.ts`.
- **Governed Exceptions:** document any temporary bypass as a Governed Exception with expiry and
  owner.

## 6. Moat & Narrative Leverage

- **Competitors miss chained-risk math**: bolt-on checks ignore tool composition, Summit treats
  tool chains as first-class attack surfaces.
- **Bolt-on security fails**: validation at a single boundary is bypassable; Summit enforces at
  every hop with evidence locks.
- **Exploit class suppression**: deterministic schemas + workspace confinement remove entire
  injection/escape categories, not just instances.
- **Compliance acceleration**: evidence-first controls yield audit-ready artifacts (SOC-2, ISO,
  NIST) without bespoke reporting.

## 7. Commit-Ready Backlog

- **Epic:** MCP Toolchain Hardening
  - **Story:** Version gate `mcp-server-git` ≥ 2025.12.18
    - **Acceptance:** CI fails if detected version is lower; `report.json` emitted
    - **Risk:** High
    - **Dependencies:** tool registry update; policy rule in `packages/decision-policy/`
  - **Story:** Deterministic arg schema for Git MCP calls
    - **Acceptance:** non-allowlisted args rejected; audit log recorded
    - **Risk:** High
    - **Dependencies:** `agents/task-spec.schema.json` update
  - **Story:** Cross-tool taint propagation
    - **Acceptance:** tool execution chain includes evidence ID; taint preserved
    - **Risk:** Medium
    - **Dependencies:** provenance ledger hooks
  - **Story:** Regression harness for RCE + file tamper
    - **Acceptance:** regression logs captured in CI; pass/fail gate
    - **Risk:** High
    - **Dependencies:** `docs/ga/TESTING-STRATEGY.md` alignment
