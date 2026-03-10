# Summit Launch Script: 5 Demos in <60 Seconds Each

## Summit Readiness Assertion

This launch script demonstrates the present-state value proposition for Summit with governed, evidence-ready outputs. It is intentionally constrained to a single-post format to compress feedback loops while preserving actionability.

## Demo 1 — What’s wrong with this famous repo?

**Hook:** Run Summit on a well-known repository and surface architectural risks instantly.

### Command

```bash
npx summit-intel analyze https://github.com/kubernetes/kubernetes
```

### On-screen output

```text
Repository Intelligence Report
------------------------------
Modules analyzed: 1,200+
High-risk dependency clusters: 7
Circular dependency risk: detected
Subsystem coupling spike: networking ↔ storage
Architecture health: MODERATE
```

### Takeaway

> CI passed, but the architecture is drifting. Summit detects structural risks tests do not catch.

---

## Demo 2 — What this PR will do to your architecture

**Hook:** Show PR Copilot catching structural damage before merge.

### GitHub PR comment (auto-posted by Summit)

```text
⚠️ Summit Architecture Copilot

Files changed: 14
Subsystems impacted: 3
New dependency introduced: ingestion → analytics
Coupling increase: +18%

Architecture risk score: 0.42 (Moderate)
Recommendation: isolate data parsing layer
```

### Takeaway

> Imagine every PR automatically checked for architecture health.

---

## Demo 3 — When did the architecture start degrading?

**Hook:** Use the Architecture Time Machine to find the root cause.

### Command

```bash
npx summit-intel timeline ./repo
```

### On-screen output

```text
Architecture Time Machine
-------------------------
Snapshots analyzed: 214
Major structural event detected

Coupling spike:
commit: a18e3f
PR: #4282
Subsystem merge: auth + gateway

Architecture health decline began here
```

### Takeaway

> Summit does not just detect problems. It tells you exactly when they started.

---

## Demo 4 — Where engineers are struggling in this codebase

**Hook:** Show hotspot analysis for real developer pain.

### On-screen output

```text
Codebase Hotspots
-----------------
Top unstable modules:

1. api/router
   commits: 72
   bug fixes: 19
   merge conflicts: high

2. auth/session-manager
   coupling index: 0.68
```

### Takeaway

> This tells you where refactoring will actually improve velocity.

---

## Demo 5 — Architecture dashboard for your repo

**Hook:** Show the visual architecture report.

### Dashboard panels

- Dependency graph
- Coupling heatmap
- Architecture drift timeline
- Risk prediction

### Example insight

```text
Predicted CI instability risk (14 days): +12%
Primary cause: dependency fan-in growth
```

### Takeaway

> This is observability for software architecture.

---

## Launch Post Copy (Single Post)

### Headline

> We built a tool that tells you when your repo’s architecture is degrading.

### Body

```text
CI tells you if tests pass.
Security scanners find vulnerabilities.

But nothing tells you if your architecture is slowly breaking.

We built Summit to solve that.

It analyzes repositories and detects:

• dependency risk
• architecture drift
• coupling growth
• structural hotspots

It even predicts which PRs will damage your architecture.

And it can rewind your repo’s history to show when problems started.

Examples below 👇
```

(Embed the five demos as attached media or threaded follow-ups.)

---

## Bonus Demo (Highest Executive Reaction): CI Failure Prediction

**Hook:** Show a likely CI break before it happens.

### Command

```bash
npx summit-intel predict-ci ./repo --window 14d
```

### On-screen output

```text
CI Failure Prediction
---------------------
Predicted instability risk: 0.61 (Elevated)
Likely break window: 3-6 days
Top contributing factors:
1) dependency fan-in growth in api/router
2) high-churn module: auth/session-manager
3) unresolved architecture drift in ingestion pipeline

Recommended action plan generated: yes
```

### Takeaway

> This is the difference between reacting to failures and preventing them.

---

## Why This Format Works

1. Immediate value in first command
2. No setup complexity in the narrative
3. Familiar repositories reduce trust friction
4. Visual and textual outputs support different audiences
5. Every demo ends with a concrete action

## Operator Notes

- Keep each demo under 60 seconds.
- Use one consistent repository theme for narrative continuity.
- Capture one screenshot per demo for social variants.
- Maintain consistent metric names across all demos.
