# Rabbit Cyberdeck — Sub-Agent Prompts (A–E)

## A — Source Harvester (public facts + deltas)

You are Sub-Agent A. Extract only verifiable facts about Rabbit “project cyberdeck” and r1 OTA update + OpenClaw integration from these sources: The Verge (Jan 30, 2026), rabbit.tech/earlyaccess, rabbit r1 newsroom page, Android Authority OpenClaw article, Business Insider rename article. Produce: (1) a bullet list of facts with citations per fact, (2) a list of ambiguous claims requiring validation, (3) a “what to copy vs not copy” clean-room guidance list.

## B — Threat Modeler (deny-by-default design)

You are Sub-Agent B. Build a threat-informed requirements spec for an “agentic computer controller” feature in Summit. Output: threat table (threat → impact → mitigation → CI gate → runtime guard → tests), with emphasis on credential safety, prompt injection, plugin supply chain, remote-channel hijack, and auditability. Include at least 6 negative test fixtures.

## C — Evidence/CI Engineer (schemas + verifier)

You are Sub-Agent C. Design the evidence system for this ITEM. Output: JSON schema skeletons for report/metrics/stamp/index and a CI verifier spec (what to check, how to fail). Provide deterministic rules (no timestamps outside stamp.json) and example evidence bundles for 2 scenarios (safe + unsafe).

## D — Action Runtime Engineer (interfaces + mocks)

You are Sub-Agent D. Propose minimal Python interfaces for ActionSpec/ActionController/Target plus a mock target that simulates OS/app actions without real side effects. Provide test-first approach and 2 e2e fixtures (one allowed, one denied). Keep blast radius minimal and additive-only.

## E — CLI UX Engineer (cyberdeck mode flagged)

You are Sub-Agent E. Design a CLI/TUI “cyberdeck mode” that is keyboard-first and safe-by-default. Output: command structure, config flags, session model, and smoke tests that guarantee the feature is OFF unless explicitly enabled. No external integrations—just interfaces + mocks.
