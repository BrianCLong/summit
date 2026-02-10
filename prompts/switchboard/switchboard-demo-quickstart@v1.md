# Prompt: Switchboard PR#3 One-command demo + smoke test

You are Jules. Create ONE atomic PR for the Summit Switchboard repo.

## Goal
Create the consumer-wedge “wow”: a single command that runs end-to-end locally and visibly
demonstrates (1) registry load/validate, (2) routing attempt, (3) policy deny-by-default, and
(4) receipts/events emitted. This must work offline and be deterministic enough for CI smoke testing.

## Scope
1) Add a demo command:
   - `switchboard demo` (or `pnpm demo:switchboard` if that’s the repo pattern)
   - Behavior:
     - loads demo registry from repo fixtures
     - runs `registry validate` internally and prints PASS + counts
     - attempts a tool call with deny-by-default policy -> prints DENY + reason
     - re-runs with an allowlisted demo policy stub/config -> prints ALLOW + selected tool/server
     - prints where receipts/events were written (local path)
   - No real network/tool execution. Use stub tool executor that returns a fixed output payload.

2) Add demo fixtures:
   - `fixtures/registry.demo.json`
   - `fixtures/policy.deny-all.json`
   - `fixtures/policy.allow-demo.json`

3) Update README:
   - Add “Getting started in 3 minutes” section with copy/paste commands:
     - install deps
     - run demo
     - show receipts list/show
     - validate registry

4) Add CI-friendly smoke test:
   - A test that runs the demo command and asserts:
     - exit 0
     - output includes markers in order:
       "REGISTRY PASS"
       "POLICY DENY"
       "POLICY ALLOW"
       "RECEIPT WRITTEN"

## Constraints
- Offline only. No external services, no network calls.
- Keep this PR independent: it may use existing modules if present, but do not modify them unless necessary.
- Use the repo’s dominant language/tooling for CLI and tests.
- Keep dependencies minimal (no heavy UI).
