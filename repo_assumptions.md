# Repo Assumptions & Reality Check

## Verified
* **Build System**: `pnpm` is used (lockfile present). `package.json` defines `build` script invoking `npm run build:client` and `npm run build:server`.
* **CI Workflows**: Existing workflows include `ci-security.yml`, `release-ga.yml`, `evidence.yml`.
* **Release Artifacts**: `release-ga.yml` assembles a `ga-release-bundle-${TAG}`.
* **Signing**: No explicit usage of `minisign` found in existing workflows. `cosign` mentioned in memory for images.

## Assumptions
* **Build Output**: `client` and `server` likely build to `dist/` or `build/`. We will assume `dist/` for the purpose of the evidence bundle or we will invoke the build and check.
* **Evidence Directory**: We will create and use `evidence/` for evidence JSON files.
* **Artifacts Directory**: We will use `artifacts/` for intermediate and final artifacts.
* **Node Version**: Workflows use node, exact version assumed to be compatible with recent LTS (based on `actions/setup-node`).

## Must-Not-Touch
* `.github/workflows/release-ga.yml` (except for reading/referencing).
* Existing secrets handling.

## Plan
* Create parallel `evidence-bundle` workflow.
* Use `minisign` for evidence signing (as requested).
* Implement deterministic packaging for build outputs.
