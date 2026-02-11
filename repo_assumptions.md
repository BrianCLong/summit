# Repo Assumptions

## Verified Paths
- `summit/`: Core Python modules.
- `tests/`: Automated test suite.
- `docs/`: Documentation.
- `scripts/`: Operational scripts.
- `artifacts/`: Build and run artifacts.

## Verified Stack
- **Language**: Python 3.12.
- **Environment**: Workspace with multiple packages.
- **CI**: GitHub Actions.

## Must-not-touch
- Security core policies (except where explicitly allowed).
- Production release pipelines.
- External lockfiles (unless sync is required).
