# Summit GA Hub

**Purpose:** Single entrypoint for GA operations, evidence, and release artifacts.

## GA Status

*   **Go/No-Go Packet**: [Commanders GO Packet](commanders-go-packet.md)
*   **Board One-Pager**: [Executive Board One-Pager](board-one-pager.md)
*   **Board Deck**: [Summit Board Pack - October 2025](../BOARD_PACK_OCTOBER_2025.md)

## Evidence & Verification

*   **GA Evidence Index**: [MVP-4 GA Evidence Map](MVP4_GA_EVIDENCE_MAP.md)
*   **Evidence Bundle Manifest**: [Verification Map](verification-map.json)
*   **Release Notes**: [Release Notes - 2025.10.HALLOWEEN](../RELEASE_NOTES_2025.10.HALLOWEEN.md)
*   **Demo Narrative**: [MVP-4 GA Demo Runbook](MVP4_GA_DEMO_RUNBOOK.md)
*   **Claim Ledger**: [Claims vs Evidence](claims-vs-evidence.md)

## Merge Train Operations

*   **Merge Train Dashboard**: [Merge Train Operations](../MERGE_TRAIN_README.md)
*   **Triage Scripts**: See `scripts/triage-conflicting-prs.sh` (referenced in Merge Train Ops)

## Public Communications (Claim-Safe)

*   **GA Announcement**: [Customer Launch Announcement](customer-launch-announcement.md)
*   **Website GA Page**: [Customer Launch Announcement](customer-launch-announcement.md) (Content Source)
*   **Drift Guard**: [Risk Drift Detection](RISK-DRIFT.md)

## Post-GA Execution

*   **Stabilization & Operations**: [GA Operator Handbook](OPERATOR_HANDBOOK.md)

## Automation Quick Commands

*   `pnpm ga:verify` - Run full GA verification suite (Types, Lint, Build, Unit, Smoke)
*   `pnpm compliance:evidence` - Generate compliance evidence artifacts
*   `make -f Makefile.merge-train mt-health` - Check merge train health status
*   `pnpm compliance:check` - Check for compliance drift
*   `node scripts/ga/verify-ga-surface.mjs` - Verify GA surface policy (if script exists)

## Maintenance Notes

*   **Conventions**: Canonical artifacts located via repo reality scan.
*   **Updates**: Keep this index synchronized with `docs/ga/` contents.
