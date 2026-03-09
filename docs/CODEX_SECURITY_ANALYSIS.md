# Codex Security Research Preview — Analysis & Summit Implications

**Date:** 2026-03-07
**Source:** OpenAI Codex Security (Research Preview)
**Status:** Informational — Strategy input

---

## 1. Executive Summary

OpenAI's Codex Security research preview introduces a sandboxed AI coding agent architecture emphasizing:

- **Isolated per-task execution environments** (sandbox/microVM per run)
- **Restricted permissions** (limited filesystem, network, and secrets scope)
- **Transparent execution logs** (terminal output, diffs, test results)
- **Human-reviewed pull requests** (agent proposes; human approves)

For Summit, this signals that the AI coding agent market is maturing from "autocomplete" toward **agentic engineering pipelines with verifiable, auditable outputs**—exactly the capability model Maestro and the Summit evidence/audit infrastructure already targets for intelligence operations.

**Strategic takeaway:** Codex Security validates the architectural bets Summit has already made (sandboxing, policy gates, evidence bundles, HITL via Switchboard). The question is how to extend those primitives to the software engineering domain rather than building a separate system.

---

## 2. Codex Security Architecture (Claim Map)

| Claim | Codex approach | Summit equivalent |
|---|---|---|
| Sandboxed execution | Per-task microVM / isolated container | `Dockerfile.sandbox`, `docker-compose.sandbox.yml`, `SECURITY/sandbox-mode.md` |
| Restricted permissions | Limited FS scope, no arbitrary secrets | OPA policies in `.opa/policy/`, `SECURITY/secrets-policy.md` |
| Transparent logs | Terminal log, command history, diff | `audit/`, `evidence/`, provenance ledger |
| Human review gate | PR review required before merge | Switchboard HITL console, `.merge-captain/`, `SECURITY/SECURITY_MERGE_POLICY.yml` |
| Prompt injection defense | Research focus of the preview | Summit threat model coverage: `SECURITY/agent-threat-model.md` |

---

## 3. Security Design Principles (Codex → Summit Mapping)

### 3.1 Sandboxed Execution

Codex runs each task in a disposable environment that can:
- read project files
- run build/test commands
- modify code
- commit results

Summit already provisions this via `Dockerfile.sandbox` and sandbox compose config. The gap is **task-scoped teardown and snapshot verification** — confirming the sandbox state at task start matches a known-good repo snapshot.

**Relevant Summit paths:**
- `SECURITY/sandbox-mode.md`
- `docker-compose.sandbox.yml`

**Recommended extension:** Add repo snapshot hash to the evidence bundle `stamp.json` so each agent run is tied to a verified repo state.

### 3.2 Restricted Permissions

Codex restricts:
- filesystem scope (repo boundary)
- token access (minimum viable secrets)
- network (controlled egress)

Summit OPA policies in `.opa/policy/` already enforce runtime constraints on Maestro agent actions. The extension for coding-agent tasks is to add a `coding-agent` policy lane that explicitly gates:
- dependency modification (requires diff review)
- credential access (deny by default)
- external network calls (allowlist only)

### 3.3 Transparent Execution Logs

Codex provides audit evidence: terminal logs, test outputs, command history, generated diffs.

Summit already captures this in the `evidence/` directory and provenance ledger. The Codex preview reinforces that **evidence completeness is a first-class requirement**, not an afterthought.

Evidence schema for agent runs should include:
```
evidence/<run_id>/
  report.json          # structured run summary
  metrics.json         # performance/cost metrics
  stamp.json           # repo snapshot hash + policy version
  terminal.log         # raw command output
  test_results.json    # structured test pass/fail
  patch.diff           # generated changes
```

### 3.4 Human-in-the-Loop Workflow

Codex workflow:
1. User assigns task
2. Codex executes in sandbox
3. Codex generates code + test results
4. Human reviews diff
5. User approves PR or requests revisions

This exactly mirrors the Switchboard design pattern. No autonomous deployment — agents submit; humans merge.

---

## 4. Threat Analysis

The Codex Security research preview explicitly targets these risk vectors. Summit's existing threat model coverage is noted.

| Threat | Codex mitigation | Summit coverage |
|---|---|---|
| Prompt injection via repo files | Research focus; prompt scanning | `SECURITY/agent-threat-model.md`, `SECURITY/SUSPICIOUS_PAYLOADS.md` |
| Secret exfiltration | Sandbox isolation, env restrictions | `SECURITY/secrets-policy.md`, OPA deny rules |
| Repo corruption / destructive writes | Branch-scoped sandbox, no direct main writes | `.merge-captain/`, branch protection policy |
| Supply chain attacks | Dependency lock verification | `SECURITY/SUPPLY_CHAIN.md`, SBOM gates |
| Malicious code execution | Sandbox containment | `Dockerfile.sandbox`, sandbox mode docs |

**Gap identified:** Summit does not yet have a formal **prompt injection scanner** as a CI gate for agent-submitted PRs. This should be added as a check in the merge policy workflow.

---

## 5. Competitive Positioning

### 5.1 Feature Comparison

| System | Isolation | Secrets control | Execution logs | PR workflow | Policy engine |
|---|---|---|---|---|---|
| **Codex** | Strong sandbox | Controlled | Full | Yes | Implicit |
| **Cursor** | None (workstation) | Local | Partial | Optional | None |
| **Claude Code** | Minimal | Local | Partial | Optional | Prompt-based |
| **Windsurf** | Minimal (IDE) | Local | Partial | Optional | None |
| **Summit/Maestro** | Sandbox available | OPA-enforced | Provenance ledger | Switchboard HITL | OPA explicit |

### 5.2 Summit's Differentiator

Summit is the only system in this comparison with **explicit policy-as-code enforcement** (OPA), a **dedicated HITL review console** (Switchboard), and an **immutable provenance ledger**. Codex has stronger sandbox isolation by default; Summit has stronger governance.

The strategic opportunity: Summit should present agent execution as **policy-governed** and **evidence-backed** rather than just sandboxed.

---

## 6. Recommended Actions

### Short-term (this sprint)

- [ ] Add `stamp.json` with repo snapshot hash to evidence bundle schema
- [ ] Draft `SECURITY/coding-agent-policy.rego` extending existing OPA agent rules
- [ ] Add prompt injection scanner to Maestro PR submission path

### Medium-term (next 4 weeks)

- [ ] Extend Switchboard to display agent execution evidence bundles alongside PR diffs
- [ ] Add "Agent Run Evidence" link to PR descriptions for agent-submitted PRs
- [ ] Document Summit's sandbox architecture relative to Codex in `docs/COMPETITIVE_POSITIONING.md`

### Strategic

- [ ] Publish Summit's agent security model as an open standard (Agent Runtime Policy spec)
- [ ] Reference Codex Security architecture in Summit's positioning vs enterprise competitors

---

## 7. References

- OpenAI Codex Security Research Preview announcement (March 2026)
- `SECURITY/agent-threat-model.md`
- `SECURITY/sandbox-mode.md`
- `SECURITY/SECURITY_MERGE_POLICY.yml`
- `.opa/policy/`
- `docs/AGENT_OVERVIEW.md`
- `RUNBOOKS/`
