# MVP-4 GA Launch Announcement

## External (public)

MVP-4 GA delivers a verifiable release process for Summit/IntelGraph: deterministic gates, explicit evidence capture, and operator-ready rollback. The value is trust you can audit, not just features you can demo.

How to try it:

```bash
make bootstrap
cp .env.example .env
make up
make smoke
```

What shipped in this GA package:

- GA release checklist and evidence index for repeatable sign-off.
- GA gate and smoke targets in the Makefile.
- Release bundle build and verification scripts.
- Rollback automation entrypoint.

Forward-looking (clearly labeled):

- Deferred pending completion: full CI parity run (`make ci`) with published evidence.
- Deferred pending completion: load-testing evidence with `k6` in a provisioned environment.
- Deferred pending completion: signed GA approvals in `docs/release/GA_READINESS_REPORT.md`.

## Internal (team update)

MVP-4 GA is now packaged as an auditable release process: evidence index, operator checklist, GA gate, release bundle verification, and rollback drill tooling. This is the minimum credible release surface for GA compliance and operational readiness.

How to try it:

```bash
make bootstrap
cp .env.example .env
make up
make smoke
```

What shipped in this GA package:

- `docs/release/GA_CHECKLIST.md` and `docs/release/GA_EVIDENCE_INDEX.md` for evidence capture.
- `make ga` and `make smoke` for deterministic validation.
- `npm run test:release-scripts` to verify release bundle tooling.
- `make rollback` wrapper for the rollback script.

Forward-looking (clearly labeled):

- Deferred pending completion: run `make ci` and attach logs to `docs/release/GA_EVIDENCE_INDEX.md`.
- Deferred pending completion: generate SBOM/provenance evidence and attach to the index.
- Deferred pending completion: load-testing baseline once `k6` is available.
