# Pilot Onboarding Runbook

This runbook describes how to generate, test, and verify the **Pilot Starter Bundle** for new sector pilots.

## 1. Generate a Pilot Bundle

To build a bundle for a specific sector (gov, finance, or critical-infra):

```bash
# Build for Government
npx tsx scripts/ci/build_pilot_starter_bundle.ts --sector gov

# Build for Finance with a specific ID
npx tsx scripts/ci/build_pilot_starter_bundle.ts --sector finance --id FIN-PILOT-001
```

The output will be located in `dist/pilot-kit/<sector>/<id>/bundle/`.

## 2. Run Acceptance Tests

Acceptance tests verify the integrity and completeness of a generated bundle. They run "offline" using the artifacts within the bundle.

```bash
pnpm pilot:acceptance --sector gov
```

This will:
1. Locate the latest bundle for the sector in `dist/pilot-kit`.
2. Verify the Trust Pack.
3. Validate synthetic data.
4. Emit results to `dist/pilot-kit/<sector>/<id>/acceptance/results/`.

## 3. Verify Bundle Integrity

To verify the checksums and ensure no forbidden terms are present in a final artifact:

```bash
npx tsx scripts/verification/verify_pilot_starter_bundle.ts dist/pilot-kit/gov/<id>
```

## 4. First 60 Minutes (Operator Script)

1. **Unpack:** Extract the tarball.
2. **Read:** Open `runbooks/pilot-ops.md`.
3. **Verify:** Check `proofs/checksums.sha256`.
4. **Deploy:** Follow the "Operation" section in the runbook.

## 5. Escalation & Rollback

- **Escalation:** If acceptance tests fail, check the `acceptance/results/acceptance-summary.md` for specific failure points.
- **Rollback:** If a bundle is defective, do not distribute. Delete the `dist/pilot-kit/<sector>/<id>` directory and rebuild.

## 6. Exit Criteria

Refer to `docs/pilots/common/pilot-exit-criteria.md` and the sector-specific delta in `docs/pilots/<sector>/exit-criteria.md` for the official checklist required to close the pilot.
