1. **Understand Golden Main requirements**
2. **Draft `docs/governance/GOLDEN_MAIN_GOVERNANCE_SPEC.md`**
   - Address the 7 points required:
     1. Golden main definition (valid state)
     2. Required checks before merge (CI gates, evidence, approvals)
     3. Evidence expectations (artifacts, schemas, validation)
     4. Archival discipline (retention, naming, indexing)
     5. Merge policy (squash/merge, commit msg, who merges)
     6. Reconciliation policy (divergence, stale PRs)
     7. Exception process (escalation, documentation)
3. **Create `GOVERNANCE.md` at repo root**
   - Canonical pointer to `docs/governance/GOLDEN_MAIN_GOVERNANCE_SPEC.md`
4. **Complete Pre-commit Steps**
   - Run necessary checks and verifications.
