# GA Readiness: Governance Gate Fix — 2026-03-11

**Lane:** Governance gate hardening
**Author:** Claude Code (claude/summit-ga-advancement-NZMHC)
**Status:** IMPLEMENTED — validated

---

## Assumption Ledger

| Item | Detail |
|------|--------|
| Assumption | All YAML policy files in `docs/ci/` are syntactically valid — confirmed by `python3 yaml.safe_load()` |
| Assumption | The governance validator is the blocking gate for CI `governance_gate` job |
| Ambiguity | Could fix by upgrading yq, or by preferring python3; chose python3-first as it is always present in CI and has no version fragility |
| Tradeoff | python3 PyYAML is a subset validator (does not catch all YAML 1.2 edge cases); acceptable because all repo policies use YAML 1.1/common patterns |
| Stop condition | If YAML files were actually invalid, we would stop and fix them rather than change the validator |

---

## Current State Observed

| Metric | Before | After |
|--------|--------|-------|
| `validate_governance_policies.sh` failures | 17 / 22 | 0 / 22 |
| `compute_governance_health.sh` score | 64 / CRITICAL | 100 / OK |
| Governance lockfile age | 8 days (WARNING) | 0 days (OK) |

**Root cause:** `validate_governance_policies.sh` uses `yq eval '.' file` syntax (Go yq v4.x), but the CI environment has Python-based `yq` v3.1.0 installed. Python yq uses jq-style syntax without `eval`, so all 15 YAML policy files reported as INVALID despite being valid. This cascaded through `compute_governance_health.sh` to produce a CRITICAL governance score, blocking the `_reusable-governance-gate.yml` workflow.

---

## Risks / Gaps

| Gap | Severity | Disposition |
|-----|----------|-------------|
| yq binary version not pinned in CI | Medium | Out of scope for this PR; document as follow-up |
| Governance lockfile has no CI auto-refresh | Low | Existing pattern; addressed manually in this PR |
| 7 manual GA gate checks still "Pending" | High | Out of scope; requires human owners per GA_BLOCKERS.md |

---

## Chosen Lane Justification

Governance gate hardening was highest leverage because:
1. **Direct CI breakage** — the governance gate workflow produces a CRITICAL result that blocks any release pipeline calling `_reusable-governance-gate.yml`
2. **Minimal surface area** — two function edits in one script, no new abstractions
3. **Deterministic evidence** — before/after scores are machine-verifiable, not subjective
4. **Low regression risk** — the python3 path already existed in the fallback; we merely changed precedence order

---

## Files Changed

| File | Change | LOC delta |
|------|--------|-----------|
| `scripts/release/validate_governance_policies.sh` | Reversed yq/python3 precedence in `validate_yaml()` and `validate_required_fields_yaml()` | +8 / -4 |
| `docs/releases/_state/governance_lockfile.json` | Refreshed lockfile snapshot (20 files, 0 missing) | regenerated |
| `docs/releases/_state/governance_SHA256SUMS` | Updated checksums | regenerated |
| `docs/ga/ga-governance-gate-fix-2026-03-11.md` | This memo | +new |

No new public APIs. No new dependencies. No new abstractions.

---

## Validations Run

```
$ bash scripts/release/validate_governance_policies.sh --verbose
[INFO] === Validation Summary ===
[INFO]   Total checks: 22
[INFO]   Passed: 22
[INFO]   Failed: 0
[INFO]   Warnings: 0
[INFO]   Skipped: 0
[PASS] All validations passed

$ bash scripts/release/compute_governance_health.sh | python3 -c ...
Score: 100 / Status: OK
  policy_validation : OK 100
  lockfile          : OK 100
  state_flags       : OK 100
  drift             : OK 100
```

---

## Follow-up PRs

1. **Pin yq version in CI** — add `yq` version check to `_reusable-governance-gate.yml` to catch future yq mismatches early
2. **Lockfile auto-refresh** — add a scheduled workflow to regenerate `governance_lockfile.json` when it ages past 7 days
3. **Manual gate owners** — assign and resolve the 7 pending items in `GA_BLOCKERS.md`
