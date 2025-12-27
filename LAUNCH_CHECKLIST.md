# Summit Launch Checklist

## Pre-Launch Checks

- [ ] **Code Freeze Enforced**: `LAUNCH_SCOPE.md` active, CI checks passing.
- [ ] **Claims Verified**: `scripts/verify_claims.cjs` returns PASS.
- [ ] **Load Tested**: `scripts/launch_day_simulation.ts` verified at 10x load.
- [ ] **Runbooks Validated**: On-call team briefed on `docs/runbooks/LAUNCH_RUNBOOKS.md`.
- [ ] **Security Scan**: Latest Snyk/Trivy scan clean (Critical/High).
- [ ] **Legal Sign-off**: Terms of Service updated for new regions.
- [ ] **Marketing**: Website copy matches `GTM_CLAIMS_MATRIX.md`.

## Launch Sequence

1.  Confirm Go/No-Go Decision (See `GO_NO_GO_GATE.md`).
2.  Enable Feature Flags for Launch Scope.
3.  Open Public Registration.
4.  Monitor `SystemHUD` for first 1h closely.

## Rollback Criteria

- **Error Rate** > 2% for 10m.
- **Data Corruption** detected.
- **Security Breach** confirmed.
