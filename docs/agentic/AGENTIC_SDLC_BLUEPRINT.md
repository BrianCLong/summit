# Agentic SDLC Blueprint

## Operating Planes

### Plane 1 — Local (Human-in-the-Loop)

Local agent runs are authoritative for iteration and review. Every run writes an evidence bundle and
is validated before sharing output. This plane is explicitly configured for human approval and
never auto-merges. Governed Exceptions are documented when legacy workflows bypass evidence.

### Plane 2 — CI (Controlled Autonomy)

CI runs operate in two modes:

- **Plan mode** (default for PRs): read-only execution, no repository writes, evidence emitted.
- **Apply mode** (workflow dispatch only): explicit operator intent with guarded permissions.

Both modes are deterministic-by-default, evidence-first, and fail closed when verification fails.

## Determinism Controls

- Stable file enumeration and sorted JSON emission in evidence bundles.
- Pinned tool versions via `package.json` and CI action SHAs.
- Explicit command lists captured in evidence to ensure replayability.
- No timestamps or machine identifiers in deterministic reports; timestamps live in `stamp.json`.

## Evidence Bundle Schema (Required)

Every agent run emits:

```
artifacts/agentic/<task>/<run-id>/
  stamp.json        # non-deterministic (timestamps, run ids)
  report.json       # deterministic (repo state + inputs)
  report.md         # derived from report.json
  provenance.json   # tool versions, commands, git status summary
  diffs.patch       # optional patch output
```

Deterministic ordering is enforced in `report.json` and validated in CI.

## Policy Gates

- **Evidence Presence**: `scripts/ci/verify_agentic_evidence.mjs` must pass.
- **Prompt Integrity**: `scripts/ci/verify-prompt-integrity.ts` enforces prompt hashes.
- **PR Metadata**: `.github/workflows/agent-guardrails.yml` enforces AGENT-METADATA blocks.
- **Governance Readiness**: `docs/SUMMIT_READINESS_ASSERTION.md` remains authoritative.

## Skills System

Prompt packs are versioned in `prompts/skills/` and registered in `prompts/registry.yaml`. Each
skill declares inputs, deterministic requirements, steps, and output artifacts (evidence bundle
required). Skills are treated as policy-as-code inputs and must remain hash-stable.

## Directory Layout (Proposed + Implemented)

```
docs/agentic/
  AGENTIC_SDLC_BLUEPRINT.md
  README.md
scripts/agentic/
  evidence_bundle.mjs
scripts/ci/
  verify_agentic_evidence.mjs
prompts/skills/
  skill-triage-to-spec.md
  skill-tests-first.md
  skill-docs-and-governance.md
  skill-security-ledger.md
  skill-release-candidate.md
.github/workflows/
  agentic-ci.yml
```

## 30/60/90 Plan

- **30 Days**: Adopt evidence bundles + CI gate, publish skills, and enforce metadata checks.
- **60 Days**: Add automated PR creation for trusted workflows and expand deterministic test packs.
- **90 Days**: Full CI agent plane with signed evidence archives and governance dashboards.
