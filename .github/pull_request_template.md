## Summary

- What changed and why?

## Evidence & Performance

- **Bench Table:** (added by CI comment)
- **Status:** ☐ PASS ☐ FAIL | **Δ tolerance:** 10% default

## Compliance & IP

- See CI comment summary
- Data handling notes (if any): <!-- e.g., PII touched? -->

## Risk & Rollback

- Risk class: ☐ Low ☐ Med ☐ High
- Rollback: `git revert -m 1 <merge-commit>` + re-run SLO pipeline

## Checklist

- [ ] Tests updated
- [ ] SLO impact considered (`sprint/benchmark/slo.yaml`)
- [ ] Neo4j PROFILE reviewed for new/changed queries (if applicable)
