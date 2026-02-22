# Community Copilot Lane 1 Plan (PR1–PR5)

## Summit Readiness Assertion (Escalation)
Reference: `docs/SUMMIT_READINESS_ASSERTION.md`.

## Scope & Intent
**Intent:** Ship a governed, Slack-first Community Support Copilot that is citation-only, deny-by-default, and evidence-backed. Lane 1 covers foundational evidence, policy gates, retrieval contract, connector skeleton, and a minimal REST surface.

**Constraints (Intentionally constrained):**
- No auto-posting or proactive actions.
- Retrieval-only answers with explicit citations or a safe refusal.
- Deterministic fixtures; timestamps only in `stamp.json`.

## Lane 1 Contracts (Inputs/Outputs)
### Input Contract
- **Workspace + Channel scope** for all actions.
- **Question** (plain text) for `/community/ask`.

### Output Contract
- **Answer** with at least one citation, or an explicit refusal.
- **Evidence bundle** with required artifacts: `report.json`, `metrics.json`, `stamp.json`, `evidence/index.json`.
- **Policy decision trace** captured in the evidence bundle.

## PR Stack Overview (PR1–PR5)
1. **PR1 – Evidence Framework (Green)**
   - Schemas for report/metrics/stamp/index.
   - Writer utility + TypeScript types.
   - Tests enforcing "timestamps only in stamp.json".
   - Docs: `docs/ga/evidence/community-copilot.md`.

2. **PR2 – Policy Gates (Green)**
   - Slack workspace + channel allowlists (tenant scoped).
   - Sanitization of untrusted content (strip tool-like directives, cap length).
   - "No citation → refuse" rule.
   - Tests: deny-by-default + positive fixtures.

3. **PR4 – GraphRAG Retrieval Contract (Yellow)**
   - CommunityCorpus document model (messages/docs).
   - Deterministic retrieval with ranked chunks.
   - Stable citation objects and contract tests.

4. **PR3 – Slack Connector Skeleton (Yellow)**
   - Read-only client for message + thread fetch.
   - Fixture-driven tests; zero network calls.

5. **PR5 – REST + Minimal Agent (Yellow)**
   - POST `/community/ask`.
   - Refuse on policy failure or missing citations.

## Determinism Rules
- Static fixtures only.
- No random IDs.
- Timestamps only in `stamp.json`.

## Evidence IDs
Format: `EVD-AI-SOLOCOMM-<AREA>-<NNN>`.

## Security & Governance Gates
- **Deny-by-default**: no allowlist = no access.
- **Citation-only**: no citations → refuse.
- **Injection hardening**: treat all inputs as untrusted.
- **Human-first**: drafts only; never auto-post.

## Required CI Gates (Lane 1)
- `pnpm test`
- Evidence schema validation tests
- Policy deny-by-default tests
- "No timestamp outside stamp.json" tests
- Dependency delta enforcement

## Rollback Plan
- PR1/PR2: safe rollback (no runtime behavior).
- PR3–PR5: guarded by `COMMUNITY_COPILOT_ENABLED=false`.

## Open Questions (Deferred pending validation)
- Slack scopes + installation UX (admin-only).
- Embedding retention vs raw text retention policy.
- Multi-workspace tenancy model alignment.

## Definition of Done (Lane 1)
- PR1–PR5 merged in order.
- CI gates green.
- Manual dogfood in one allowlisted workspace.
- Evidence bundles validated and exportable.
