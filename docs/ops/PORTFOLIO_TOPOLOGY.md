# Portfolio Topology Matrix

This matrix provides a high-level overview of the repositories, products, and components within the Summit portfolio. It serves as the foundational document for the federated GA Operating System.

| Repo                      | Product/Component | Release Unit         | CI Gate                      | Evidence Status     | Claim Surfaces | Dependencies                      |
| ------------------------- | ----------------- | -------------------- | ---------------------------- | ------------------- | -------------- | --------------------------------- |
| `apps/summit-app`         | Product           | Main Deployment      | `.github/workflows/ci.yml` | Tracked in CI   | TBD            | `packages/common-utils`, `services/intelgraph-server` |
| `summit-mini/`            | Product           | Standalone Deployment| `summit-mini/.github/workflows/ci.yml` (Assumed) | TBD                 | TBD            | None (Assumed Standalone)         |
| `services/intelgraph-server` | Component         | Main Deployment      | `.github/workflows/intelgraph-ci.yml` | Tracked in CI   | TBD            | `packages/common-utils`           |
| `packages/common-utils`   | Component         | NPM Package          | `.github/workflows/ci-core.yml` | Tracked in CI   | TBD            | None                              |
