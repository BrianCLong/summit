### Verified

* None (no live repo inspection).

### Assumed (must validate)

* Python package layout: `summit/` as main module.
* Tests: `pytest` in `tests/`
* CI: GitHub Actions under `.github/workflows/ci.yml`
* CLI entrypoint exists (e.g., `summit/__main__.py` or `scripts/`)

### Must-not-touch (until verified)

* Release automation, lockfiles, existing evaluation baselines, any `docs/` conventions.

### Validation checklist (do this before PR1 merges)

* List root tree, confirm language/tooling, locate existing agent runner interfaces
* Confirm evidence schema conventions (filenames, IDs, timestamp rules)
* Confirm CI check names + required status checks
* Confirm licensing posture + third-party policy
