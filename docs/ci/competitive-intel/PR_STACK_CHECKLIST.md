# Competitive Subsumption PR Stack Checklist

**Prime Directive:** Deliver mergeable, patch-first PRs that subsume public, license-respecting
value into Summit-native modules/contracts and surpass the target with governed controls.
All claims reference `docs/SUMMIT_READINESS_ASSERTION.md` and the Meta-Governance chain.

## PR Header Requirements

- [ ] PR title format: `[CI:<target_slug>] <concise theme>`.
- [ ] PR includes the required JSON metadata block from `.github/PULL_REQUEST_TEMPLATE.md`.
- [ ] Evidence-first: raw evidence bundle produced before narrative summaries.
- [ ] Sensing vs Reasoning: evidence bundle labeled as **Sensing**, analysis as **Reasoning**.

## Scope & Determinism

- [ ] Single theme, minimal blast radius, patch-first (< ~500 LOC when possible).
- [ ] Deterministic outputs: stable ordering; no timestamps in governed outputs.
- [ ] No proprietary code; public sources only; license constraints recorded.

## Evidence Envelope Updates (Each PR)

- [ ] `docs/ci/targets/<target_slug>.yml` updated (scope + source version pinned).
- [ ] `docs/ci/evidence/<target_slug>/EVIDENCE.md` appended with new evidence.
- [ ] `docs/ci/evidence/<target_slug>/SOURCES.md` updated with URLs + license notes.
- [ ] `docs/ci/evidence/<target_slug>/CLAIMS.yml` updated with claim → citation links.
- [ ] `evidence/map.yml` updated if new evidence IDs are introduced.

## Governance & Compliance

- [ ] Legal/OSS hygiene verified (license allows summary/derivative work; attribution logged).
- [ ] Governing authority files referenced in the PR description.
- [ ] Decision reversibility documented (rollback triggers + steps).
- [ ] Governed Exceptions recorded if used.

## MAESTRO Threat Modeling (Required)

- [ ] **MAESTRO Layers**: Foundation, Data, Agents, Tools, Infra, Observability, Security.
- [ ] **Threats Considered**: goal manipulation, prompt injection, tool abuse.
- [ ] **Mitigations**: measurable controls reducing confidentiality/integrity/safety risk.

## Tests & Verifiers

- [ ] Tests added/updated for new logic (Arrange-Act-Assert).
- [ ] Required gates run (`pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `make smoke`).
- [ ] Verifiers added for schema gating, replay safety, determinism (as applicable).

## Differentiation & Surpass Plan

- [ ] Differentiator(s) defined with measurable KPIs.
- [ ] Observability hooks present (metrics, traces, alerts).
- [ ] Moat & gate controls codified (schema gate, integrity gate, upgrade gate, evidence gate).

## Final Review

- [ ] All claims have citations; no uncited competitive assertions.
- [ ] PR stack order and intent recorded in `docs/ci/evidence/<target_slug>/DECISIONS.md`.
- [ ] GA readiness preserved; no bypass of security or evidence gates.

