# OpenClaw-on-Lightsail Subsumption: Repo Assumptions

This document records intentionally constrained assumptions for implementing the OpenClaw subsumption plan before full module-level validation.

## Assumed layout

```text
/workspace/summit
  /agents
  /evidence
  /scripts
  /tests
  /docs
```

## Verification checklist

- [ ] Confirm active CI workflow names for determinism and policy gates.
- [ ] Confirm evidence artifact schema fields and canonicalization constraints.
- [ ] Confirm runtime implementation language placement (`packages/` vs top-level module).
- [ ] Confirm standards documentation authority path under `docs/standards/`.
- [ ] Confirm security and data-handling authority path under `docs/security/data-handling/`.

## Governance note

Assumptions remain active only until replaced by repository-verified facts in implementation PRs.
