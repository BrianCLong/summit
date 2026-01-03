# Evidence Packs

Evidence Packs are deterministic, immutable artifacts produced by the Release Preflight system. They serve as the "Bill of Materials" for the quality of a release.

## Directory Structure

Evidence packs are stored in `evidence/release-preflight/` keyed by timestamp.

```text
evidence/release-preflight/
└── <YYYY-MM-DDTHH-mm-ss-msZ>/
    ├── summary.md            # Human-readable report (copy-paste to PR)
    ├── summary.json          # Machine-readable results
    ├── environment.json      # Node/OS/Git context
    ├── workspace-scripts.json # Snapshot of available scripts
    └── logs/                 # Full capture of each stage
        ├── install.log
        ├── lint.log
        ├── typecheck.log
        ├── build.log
        ├── test.log
        ├── policy-test.log
        └── prod-guard.log
```

## Attaching to PRs

When opening a Release PR (e.g., merging `dev` to `main` or preparing a tag):

1. Run the preflight:
   ```bash
   pnpm release:preflight
   ```
2. Locate the generated `summary.md` in the `evidence/` directory.
3. Paste the content of `summary.md` into the Pull Request description under a "Release Assurance" heading.
4. Commit the evidence pack to the repository (optional, depending on policy) or archive it.

## GA Requirements

For a General Availability (GA) release, the Evidence Pack must show:
- **Status:** ✅ PASS
- **P0 Issues:** 0
- **P1 Issues:** 0 (unless explicitly waived via Risk Acceptance)

## Troubleshooting

- **🛑 FAIL (P0):** Hard failure. The release is blocked. Fix the code.
- **⚠️ WARNING (P1):** Flakiness or hygiene issue. Review `summary.md`. If it's a known flake, it may be waived, but it indicates degradation.
