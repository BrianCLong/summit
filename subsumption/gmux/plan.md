# 1.0 ITEM Overview

**ITEM:** `gmux`
**Type:** developer tool / terminal multiplexer UI
**Language:** C (~2300 LOC)
**Concept:** lightweight GUI wrapper around VTE terminals enabling multiple project terminals in a single window with a vertical sidebar.

Purpose: manage multiple coding agents / shells visually without tmux complexity.

Key characteristics:

* GTK4 GUI
* VTE terminal emulation
* tabbed terminal sessions
* lightweight binary (~28KB)
* designed for managing many concurrent dev agents

This maps naturally to **Summit’s orchestration layer for agent execution environments**.

---

## 1.1 Ground Truth Capture

(Extracted claims grounded in publicly posted description)

**ITEM:CLAIM-01**
“native GTK4 terminal multiplexer with a visual tab sidebar.” ([Reddit](https://www.reddit.com/r/VibeCodersNest/comments/1rhpmsb/gmux_manage_multiple_project_terminals_on_one/?utm_source=chatgpt.com))

**ITEM:CLAIM-02**
“Full VTE terminal emulation (same engine as GNOME Terminal).” ([Reddit](https://www.reddit.com/r/VibeCodersNest/comments/1rhpmsb/gmux_manage_multiple_project_terminals_on_one/?utm_source=chatgpt.com))

**ITEM:CLAIM-03**
“Vertical tab sidebar — click to switch.” ([Reddit](https://www.reddit.com/r/VibeCodersNest/comments/1rhpmsb/gmux_manage_multiple_project_terminals_on_one/?utm_source=chatgpt.com))

**ITEM:CLAIM-04**
“Add/remove terminals with + / - buttons.” ([Reddit](https://www.reddit.com/r/VibeCodersNest/comments/1rhpmsb/gmux_manage_multiple_project_terminals_on_one/?utm_source=chatgpt.com))

**ITEM:CLAIM-05**
“Dynamic tab titles that update from your shell.” ([Reddit](https://www.reddit.com/r/VibeCodersNest/comments/1rhpmsb/gmux_manage_multiple_project_terminals_on_one/?utm_source=chatgpt.com))

**ITEM:CLAIM-06**
“10,000 lines scrollback, mouse support.” ([Reddit](https://www.reddit.com/r/VibeCodersNest/comments/1rhpmsb/gmux_manage_multiple_project_terminals_on_one/?utm_source=chatgpt.com))

**ITEM:CLAIM-07**
“~2300 lines of C, compiles to a 28KB binary.” ([Reddit](https://www.reddit.com/r/VibeCodersNest/comments/1rhpmsb/gmux_manage_multiple_project_terminals_on_one/?utm_source=chatgpt.com))

---

## 1.2 Claim Registry

| Planned Summit Element                 | Source          |
| -------------------------------------- | --------------- |
| Summit multi-agent terminal supervisor | ITEM:CLAIM-01   |
| Summit visual terminal sessions        | ITEM:CLAIM-03   |
| Shell-backed task runners              | ITEM:CLAIM-02   |
| Dynamic session naming                 | ITEM:CLAIM-05   |
| Session lifecycle management           | ITEM:CLAIM-04   |
| Session logs / scrollback ingestion    | ITEM:CLAIM-06   |
| Ultra-light agent execution containers | Summit original |

---

## 1.3 Strategic Fit for Summit

### Summit Problem

AI coding agents require:

* multiple concurrent shells
* deterministic command orchestration
* visible logs
* reproducible execution

Traditional tools:

| Tool             | Problem        |
| ---------------- | -------------- |
| tmux             | keyboard heavy |
| VSCode terminals | heavy          |
| tilix/terminator | desktop-only   |

### gmux insight

> Visual multiplexing optimized for multiple agent sessions.

For Summit this becomes:

### Agent Runtime Visualizer + Terminal Supervisor

---

## 1.4 Subsumption Strategy

Instead of integrating gmux UI directly:

We subsume the **conceptual primitives**:

```text
terminal-session
terminal-manager
session-sidebar
session-metadata
```

into Summit’s agent runtime.

Result:

### Summit Terminal Fabric

```text
agent
  ├── shell runtime
  ├── session metadata
  ├── output stream
  └── lifecycle controller
```

---

## 1.5 Minimal Winning Slice (MWS)

### MWS

> Summit can launch and manage multiple agent shells simultaneously with deterministic session metadata and logs.

### Acceptance Tests

```text
summit run-agent agentA
summit run-agent agentB
```

Expected:

```text
summit sessions list
```

outputs

```text
agentA running
agentB running
```

Artifacts produced:

```text
.artifacts/sessions/<id>/stdout.log
.artifacts/sessions/<id>/metadata.json
.artifacts/sessions/index.json
```

Roll-forward plan:

```text
MWS → UI → session orchestration → distributed agents
```

---

## 1.6 Repo Reality Check

Repo access unavailable.

### ASSUMPTED structure

```text
summit/
  cmd/
  pkg/
  internal/
  scripts/
  docs/
  .github/workflows/
```

### Must-not-touch files

```text
cmd/summit/main.go
pkg/core/*
pkg/agent/*
```

### Validation checklist

Before PR1:

```text
confirm:
- CLI framework
- artifact directory
- logging system
- CI check names
- evidence schema
```

Produce:

```text
docs/repo_assumptions.md
```

---

## 1.7 Architecture to Introduce

### Terminal Session Manager

```text
internal/terminal/
    session.go
    manager.go
    runner.go
```

### Session Metadata

```text
pkg/evidence/session/
    session_schema.json
```

### Runtime CLI

```text
cmd/summit/terminal.go
```

---

## 1.8 PR Stack (Max 6)

### PR1 — terminal session schema

```text
feat(session): introduce terminal session model
```

Files

```text
pkg/session/session.go
pkg/session/session_schema.json
tests/session_schema_test.go
```

Patch sketch

```go
type Session struct {
    ID string
    Agent string
    Command string
    StartedAt int64
    Status string
}
```

Artifacts

```text
report.json
metrics.json
stamp.json
```

---

### PR2 — session manager

```text
feat(runtime): terminal session manager
```

Files

```text
internal/terminal/manager.go
```

Patch

```go
func StartSession(agent string, cmd string) (*Session, error)
```

---

### PR3 — process runner

```text
feat(runtime): shell execution engine
```

Files

```text
internal/terminal/runner.go
```

Patch

```go
cmd := exec.Command("bash","-lc",command)
```

Logs:

```text
.artifacts/sessions/<id>/stdout.log
```

---

### PR4 — CLI interface

```text
feat(cli): summit sessions command
```

Commands

```text
summit sessions list
summit sessions kill
summit sessions logs
```

---

### PR5 — deterministic logging

```text
feat(evidence): session output capture
```

Output schema

```text
stdout.log
stderr.log
metadata.json
```

---

### PR6 — agent session integration

```text
feat(agent): bind agent runtime to session manager
```

Agents launch through session API.

---

## 1.9 Threat-Informed Requirements

| Threat            | Mitigation           | Gate          |
| ----------------- | -------------------- | ------------- |
| shell injection   | sanitize args        | unit test     |
| log poisoning     | escape control chars | parser test   |
| runaway processes | timeout watchdog     | runtime guard |
| artifact flooding | size limits          | CI check      |

Tests

```text
tests/security/test_shell_injection.go
tests/security/test_log_escape.go
```

---

## 1.10 Performance & Cost Budgets

| Metric         | Budget |
| -------------- | ------ |
| agent spawn    | <150ms |
| memory/session | <20MB  |
| log write      | <5ms   |

Profiling harness

```text
scripts/bench/session_bench.go
```

Outputs

```text
benchmarks.json
```

---

## 1.11 Data Classification

File

```text
docs/security/data-handling/terminal-sessions.md
```

Never log:

```text
API keys
SSH private keys
.env secrets
tokens
```

Retention

```text
logs: 7 days
session metadata: 30 days
```

---

## 1.12 Interop & Standards

File

```text
docs/standards/gmux-terminal-model.md
```

| Import          | Export          |
| --------------- | --------------- |
| tmux sessions   | Summit sessions |
| shell commands  | session logs    |
| agent processes | telemetry       |

Non-goals

```text
no terminal UI in summit
no GTK dependency
no desktop integration
```

---

## 1.13 Operational Readiness

Runbook

```text
docs/ops/runbooks/terminal-runtime.md
```

Alerts

```text
>100 sessions running
session crash loops
log size >100MB
```

SLO

```text
99.9% session start success
```

---

## 1.14 Competitive Teardown

| Tool  | Capability       | Summit advantage   |
| ----- | ---------------- | ------------------ |
| tmux  | CLI multiplexing | agent integration  |
| warp  | modern terminal  | automation         |
| tilix | GUI tabs         | deterministic logs |
| gmux  | lightweight tabs | orchestration      |

Positioning

### Summit

```text
AI-agent terminal orchestrator
```

Not just terminal UI.

---

## 1.15 Post-Merge Monitoring

Drift detector

```text
scripts/monitoring/session-drift.go
```

Checks

```text
orphan processes
log corruption
session metadata drift
```

Outputs

```text
drift_report.json
```

Scheduled CI

```text
weekly-session-health.yml
```

---

## 2.0 Agent Convergence Protocol

Agents:

```text
Research Agent
Runtime Agent
Security Agent
CI Agent
Docs Agent
```

Shared WBS

```text
1 schema
2 runner
3 manager
4 cli
5 evidence
6 integration
```

Conflict rule

```text
Master plan wins
agents propose diffs only
```

Merge queue

```text
PR1 → PR2 → PR3 → PR4 → PR5 → PR6
```

---

## 3.0 Patch-First Example

Example patch (PR3)

```text
diff --git a/internal/terminal/runner.go b/internal/terminal/runner.go
+func RunCommand(command string) (*exec.Cmd, error) {
+    cmd := exec.Command("bash","-lc",command)
+    return cmd,nil
+}
```

---

## 4.0 Net Effect for Summit

After this subsumption:

Summit gains:

```text
multi-agent terminal runtime
deterministic shell orchestration
session logging
agent lifecycle visibility
```

Which becomes the base for:

```text
distributed agents
CI automation
agent debugging
```

---

✅ **Subsumed capability**

```text
gmux visual multiplexing
→ summit terminal orchestration
```
