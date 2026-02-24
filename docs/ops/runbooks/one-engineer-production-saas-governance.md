# Runbook: one-engineer-production-saas-governance

## Trigger
- governance-pack-check fails or drift detector reports policy removal.

## Immediate Actions
- Triage failing gate and identify missing section (classification/threat/abuse fixtures).
- Regenerate artifacts with `scripts/governance/generate_pack.py`.
- Re-run governance checks before merge.

## Rollback
- Set feature flag `GOVERNANCE_PACK_ENFORCEMENT=false` if emergency bypass is approved.
