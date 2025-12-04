# Release Hygiene Checklist (S25 Consolidated Merge)

Attach this checklist to the final release PR (`release: S25 consolidated merge`). All items must be checked before merging to `main`.

## 1. Diff & Patch Hygiene

- [ ] **Range-Diff Review**: Verify the cherry-picked commits match the original intent without silent drops.
  ```bash
  # Compare main...consolidation vs original PR refs (if available) or just review the diff stats
  # This shows what is unique to the feature branch compared to main.
  git range-diff main...feature/merge-closed-prs-s25
  ```
- [ ] **Duplicate Patch Detection**: Ensure no commit was applied twice (e.g. via squash-merge AND cherry-pick).
  ```bash
  # Should return 0. If >0, investigate the SHAs.
  bash scripts/check_dupe_patches.sh main feature/merge-closed-prs-s25
  ```
- [ ] **Commit Message Audit**: No generic "Merge branch..." messages; all `mergefix` commits are scoped.

## 2. Quality Gates & SLOs

- [ ] **SLO Snapshot (Performance)**:
  - [ ] **p95 GraphQL Query**: < 350ms (Run: `make k6-query`)
  - [ ] **Ingest E2E Latency**: < 5m for 10k batch (Run: `make k6-ingest`)
  - [ ] **Error Rate**: < 1%
- [ ] **Contracts**: GraphQL N-1/N-2 schema compatibility confirmed.
  ```bash
  pnpm jest contracts/graphql/__tests__/schema.contract.ts
  ```
- [ ] **Policy Simulation**: OPA policies pass in "hard fail" mode.
  ```bash
  ./opa test policies/ -v
  ```

## 3. Artifacts & Provenance

- [ ] **SBOM**: Generated and signed?
  - [ ] `sbom.json` present in artifacts.
  - [ ] `sbom.sig` verifies against the release key.
- [ ] **Provenance Manifest**: Verified?
  - [ ] `provenance.json` generated.
  - [ ] `node .ci/verify-provenance.js provenance.json` prints "OK".

## 4. Rollback Drill (Auditable)

Perform this **dry run** locally or in staging before merge:

1.  **Tag Pre-Merge State**:
    ```bash
    git tag vS25-pre-merge main
    ```
2.  **Simulate Bad Deploy**:
    - Deploy `feature/merge-closed-prs-s25`.
    - Verify health check fails (simulated).
3.  **Execute Rollback**:
    ```bash
    # Command to revert to the safe tag
    ./ops/rollback/rollback-to-tag.sh vS25-pre-merge
    ```
4.  **Verify Restoration**:
    - `curl http://localhost:4000/health` returns 200 OK.
    - Database schema matches `vS25-pre-merge` state (if applicable).

**Drill Result**: [ ] PASS / [ ] FAIL
**Drill Operator**: __________________
**Timestamp**: __________________
