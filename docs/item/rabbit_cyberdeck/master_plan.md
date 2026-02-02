# Rabbit Cyberdeck — Master Plan (Summit Alignment)

## 1.0 ITEM INTAKE (what we have)

- ITEM link provided: Perplexity page (non-retrievable via tooling; deferred pending source capture).
- Closest public primary/secondary coverage found:
  - The Verge post (Jan 30, 2026) summarizing Rabbit’s announcements.
  - Rabbit official “early access” page describing the “rabbit cyberdeck” concept.
  - Rabbit original r1 announcement / positioning (LAM, rabbithole, privacy claims, $199, etc.).
  - Coverage/context on OpenClaw (what it is, why it matters).
- Constraint: Treat the Perplexity page as non-retrievable; proceed with public corroborated facts and mark gaps as deferred pending source capture.

## 1.1 VERIFIED FACTS (from public sources)

- Rabbit is exploring a new hardware concept: a dedicated “cyberdeck” aimed at CLI + native agent use cases; mentions “vibe coders,” “Claude Code CLI,” and “upcoming rabbit CLI,” plus “hot-swappable mechanical keyboard” and freedom to choose models/agents.
- Rabbit Inc. r1 positioning (historical): “rabbit OS” built on “Large Action Model (LAM),” “learns by demonstration,” cloud-executed actions; claims about not storing third-party credentials; PTT microphone; camera defaults blocking lens; device price/ship statements (as originally announced).
- Reporting says Rabbit announced (a) “project cyberdeck” and (b) an r1 OTA update that makes r1 a “plug-and-play computer controller” for agentic tasks and integrates OpenClaw (formerly Moltbot/Clawdbot).
- OpenClaw is described publicly as an assistant that can perform tasks (email/calendar/etc.) via chat apps, and as an OS-level automation layer bridging LLMs and a computer.
- Name-change/trademark dispute context exists around Clawdbot → Moltbot → OpenClaw; coverage attributes the rename pressure to Anthropic trademark concerns.

## 1.2 ASSUMPTIONS (explicit, with validation plan)

- ASSUMPTION A: Summit has (or wants) an agent runtime that can execute tool calls/actions with policy gating.
- ASSUMPTION B: Summit can add a CLI/TUI surface without destabilizing existing UI surfaces.
- ASSUMPTION C: Summit has CI where we can add required checks + schema validation jobs.

Validation plan (deferred pending source capture):

- Add required_checks.todo.md with GitHub UI/API steps; require maintainers to paste actual check names into ci/required_checks.json in PR2.
- Add “adapter-first” abstractions and pure mocks so everything compiles/tests without production credentials or device hooks.

## 1.3 SUMMIT IMPACT HYPOTHESES (why this matters)

- Rabbit’s “cyberdeck” framing is a market signal: agentic workflows are moving to CLI-native surfaces (coding + ops).
- OpenClaw highlights the “AI that does things” expectation: persistent agent + computer access + plugin/skills ecosystem.
- Summit can subsume this by shipping:
  1. a safe action-controller interface,
  2. a policy + evidence envelope,
  3. a model/agent portability layer,
  4. CLI-first workflow primitives—while deny-by-default.

## 1.4 COMPETITIVE DISTILLATION (harvestable patterns)

- “Dedicated device” is less important than the interaction model: quick invocation, physical controls/keyboard, minimal distraction.
- “Computer controller” implies a generic remote actuator pattern: send intent → agent executes on a target environment.
- “Choose which model or agent to run” suggests pluggable provider architecture.
- Skills/plugins growth implies an ecosystem surface that must be governed (permissions, provenance, sandboxing).

## 1.5 CAPABILITY HARVEST → SUMMIT FEATURES (patch-first)

### Foundation (must-merge)

- Action Controller API (local “target” abstraction; initially mocked).
- Policy engine for actions (deny-by-default; allowlists; redaction).
- Evidence system (EVD IDs, report.json, metrics.json, stamp.json, evidence/index.json).
- Eval harness for “agentic action” scenarios (fixtures: pass + fail).

### Innovation (flagged, OFF by default)

- Cyberdeck Mode: Summit CLI/TUI shell + “agent sessions”.
- Chat Remote Adapter interface (no real WhatsApp/Telegram integration; only adapter contracts + mocks).
- Teachmode-like recorder: “demonstration trace” capture into evidence artifacts (no model training).

## 1.6 THREAT MODEL (threats → mitigations → gates/tests)

Key threats (from the problem shape)

- T1: Unauthorized OS/app actions (agent overreach).
- T2: Credential leakage (logs, artifacts, traces).
- T3: Supply-chain poisoning via plugins/skills.
- T4: Prompt-injection → action execution.
- T5: Remote control channel hijack.

Mitigations shipped as CI/runtime gates

- M1: Deny-by-default action policy; explicit allowlists by action kind + target.
- M2: “Never-log fields” redaction layer; fixture proving secrets do not appear in artifacts.
- M3: Plugin manifest + provenance metadata; dependency-delta enforcement per PR.
- M4: Prompt-to-action requires “intent confirmation token” in non-test mode (feature flag).
- M5: Remote adapter requires signed request envelope + replay protection (mocked now; enforced by schema + tests).

## 1.7 GA TARGET OUTCOMES (minimum viable subsumption)

- A safe, testable Action Controller with policies.
- Evidence artifacts produced on every eval run.
- Required checks discoverable + enforceable.
- Innovation lane present but OFF.

## 1.8 ARCHITECTURE SUBSUMPTION MAP (where it lands in Summit)

- summit/agents/ — orchestration + session state
- summit/actions/ — action specs + controller interface
- summit/policy/ — deny-by-default evaluator
- summit/evidence/ — artifact writer + schemas
- summit/cli/ — cyberdeck mode (flagged)
- tests/e2e/agentic/ — eval fixtures + replay

## 1.9 DATA MODEL CHANGES (minimal)

- ActionSpec (type, target, params, risk, audit fields)
- ActionResult (status, outputs, redactions)
- EvidenceIndex mapping EVD → files + hashes (hashing optional, but schema supports it)

## 1.10 APIs / EXTENSION POINTS

- ActionController.execute(ActionSpec) -> ActionResult
- PolicyEngine.evaluate(ActionSpec, context) -> ALLOW|DENY + reason
- ModelProvider (string name + config blob; no provider code copied; stubs only)
- Adapter interface for remote channels (mocked)

## 1.11 UX / WORKFLOWS (Summit-native)

- summit agent run --scenario <fixture> produces evidence bundle.
- summit cyberdeck enters TUI, starts an “agent session” (flagged).
- “Teach trace” (flagged) records action steps into evidence for review.

## 1.12 EVIDENCE SYSTEM (always)

Evidence IDs (example set)

- EVD-RABBITCYBERDECK-ACTION-001 action policy allow/deny matrix
- EVD-RABBITCYBERDECK-REDACT-002 secret redaction proof
- EVD-RABBITCYBERDECK-SUPPLY-003 dependency delta + plugin provenance
- EVD-RABBITCYBERDECK-EVAL-004 end-to-end agentic scenario replay
- EVD-RABBITCYBERDECK-CLI-005 cyberdeck-mode smoke (flagged)

Required artifacts per EVD

- report.json (human-readable structured summary)
- metrics.json (numbers only)
- stamp.json (timestamps only here)
- evidence/index.json (EVD → file list + optional hashes)

## 1.13 EVAL HARNESS (deny-by-default fixtures)

- Positive fixtures: allowed safe actions (read-only listing, noop).
- Negative fixtures: disallowed actions (filesystem write, network exfil, unknown plugin).
- All fixtures must generate evidence artifacts and assert redaction.

## 1.14 GOVERNANCE & POLICY GATES

- POLICY_NO_SECRETS_IN_ARTIFACTS
- POLICY_DENY_UNKNOWN_ACTIONS
- POLICY_PLUGIN_PROVENANCE_REQUIRED
- Each policy has fail fixtures + pass fixtures.

## 1.15 SUPPLY CHAIN CONTROLS

- Per PR: docs/deps/dependency_delta.md required if dependencies change.
- CI job: verify-deps fails if deps changed without delta doc.

## 1.16 OBSERVABILITY / AUDIT

- Structured audit events: action_requested, action_denied, action_executed
- Never-log fields enforced (tokens, passwords, cookies, raw prompts if classified)

## 1.17 DATA HANDLING RULES

- Classification: PUBLIC, INTERNAL, SENSITIVE
- Default: treat prompts, transcripts, traces as SENSITIVE
- Retention: evidence bundles are ephemeral in CI unless explicitly uploaded

## 1.18 SECURITY TESTING

- Snapshot tests ensure redaction.
- Property tests for policy determinism (same input → same decision).
- Static checks for “never-log” fields.

## 1.19 INTEROP: DEVICE/CLI LESSONS WITHOUT COPYING

- Don’t build hardware. Build hardware-shaped UX:
- Instant launch CLI session
- Keyboard-first shortcuts
- Minimal UI state
- Keep “model choice” as config, not hardwired.

## 1.20 PR STACK OVERVIEW (≤7 PRs; max 2 yellow; 0 red)

| PR  | Lane       | Risk   | Goal                                                       |
| --- | ---------- | ------ | ---------------------------------------------------------- |
| 1   | Foundation | Green  | Evidence scaffolding + required check discovery            |
| 2   | Foundation | Green  | Deny-by-default policy engine + tests                      |
| 3   | Foundation | Yellow | Action controller interface + mocked target + eval harness |
| 4   | Foundation | Green  | Supply-chain gate + provenance manifests                   |
| 5   | Innovation | Yellow | Cyberdeck CLI/TUI (flagged OFF)                            |
| 6   | Innovation | Green  | Remote adapter interfaces + signed envelope schema (mock)  |
| 7   | Innovation | Green  | Teach-trace recorder → evidence (flagged OFF)              |

## 1.21 PR1 — Evidence scaffolding + required-check discovery (Foundation, Green)

Add files (new)

- evidence/README.md
- evidence/schemas/report.schema.json
- evidence/schemas/metrics.schema.json
- evidence/schemas/stamp.schema.json
- evidence/schemas/index.schema.json
- evidence/index.json (empty mapping)
- required_checks.todo.md

Minimal patch (skeleton)

```
+ evidence/
+   README.md
+   index.json
+   schemas/
+     report.schema.json
+     metrics.schema.json
+     stamp.schema.json
+     index.schema.json
+ required_checks.todo.md
```

## 1.22 PR2 — Policy engine deny-by-default + fixtures (Foundation, Green)

Add

- summit/policy/engine.py
- summit/policy/types.py
- tests/policy/test_deny_by_default.py
- tests/fixtures/policy/allow.json
- tests/fixtures/policy/deny.json

Key behaviors

- Unknown action kinds: DENY
- Missing provenance: DENY
- Classified fields in logs/artifacts: DENY build (test enforced)

## 1.23 PR3 — Action controller + mocked “computer controller” target + eval harness (Foundation, Yellow)

Add

- summit/actions/spec.py
- summit/actions/controller.py
- summit/actions/targets/mock_target.py
- summit/evidence/writer.py
- tests/e2e/agentic/test_agentic_replay.py
- tests/fixtures/agentic/scenario_safe.json
- tests/fixtures/agentic/scenario_unsafe.json

Why Yellow

- Introduces cross-module integration (policy + actions + evidence). Still mocked; no real OS hooks.

## 1.24 PR4 — Supply-chain + plugin provenance gate (Foundation, Green)

Add

- summit/plugins/manifest.schema.json
- summit/plugins/registry.py (no dynamic loading yet)
- tools/ci/verify_deps.py
- tools/ci/verify_provenance.py
- docs/deps/dependency_delta.md (template)

## 1.25 PR5 — “Cyberdeck mode” CLI/TUI (Innovation, Yellow, FLAG OFF)

Add

- summit/cli/cyberdeck.py
- summit/cli/flags.py (CYBERDECK_MODE=0 default)
- tests/cli/test_cyberdeck_flag_off.py
- docs/cyberdeck_mode.md

## 1.26 PR6 — Remote adapter interface + signed envelope schema (Innovation, Green, FLAG OFF)

Add

- summit/remote/envelope.schema.json
- summit/remote/adapters/base.py
- summit/remote/adapters/mock_chat.py
- tests/remote/test_envelope_replay_protection.py

## 1.27 PR7 — Teach-trace recorder (Innovation, Green, FLAG OFF)

Add

- summit/teach/recorder.py
- summit/teach/trace.schema.json
- tests/teach/test_trace_redaction.py

## 1.28 ROLLBACK / KILL-SWITCH PER PR

- PR1–PR4: additive only; rollback by revert commits.
- PR5–PR7: runtime kill switch via summit/cli/flags.py defaults OFF + CI test asserting OFF-by-default.

## 1.29 ACCEPTANCE CHECKLIST (merge gates)

- required_checks.todo.md completed by maintainers; actual checks wired.
- All tests pass; negative fixtures fail when policy disabled (prove gate works).
- Evidence bundles produced in CI for e2e tests.
- No secret-like tokens appear in report.json/metrics.json/index.json (unit test).
- Innovation flags default OFF; verified by tests.
