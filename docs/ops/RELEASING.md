# Summit Release Doctrine (Single Source of Truth)

_Last updated: 2026-01-02_

This document is the canonical release playbook for the Summit/IntelGraph platform. It aligns local steps with the GitHub Actions workflows (`release-train.yml`, `release-integrity.yml`, `release-ga.yml`) and Make targets to ensure every release is reproducible, verifiable, and auditable.

## 1. Scope and Prerequisites

- **Release surfaces:** monorepo packages built via `pnpm build` (server, client, supporting packages); container images built through the SLSA reusable workflow; evidence bundles and SBOM outputs.
- **Tooling:** Node.js 20.x, pnpm 10.x, Docker/Buildx, `gh` CLI (for workflow dispatch), `cosign` (to verify signatures), and Kubernetes CLI for rollout verification when using `Makefile.release`.
- **Credentials:** permissions to push tags, read GitHub Actions artifacts, and access container registry credentials used by `_reusable-slsa-build.yml`.

## 2. Versioning Rules (Locked Strategy)

- **Source of truth:** `package.json` version and matching `CHANGELOG.md` heading (latest release). Use SemVer (MAJOR.MINOR.PATCH).
- **Commit hygiene:** Conventional commits and PR SemVer labels enforced by `.github/workflows/semver-label.yml` to signal breaking (`major`), feature (`minor`), or patch (`patch`) changes.
- **Enforcement:** Run `pnpm run release:version-check` or `make release-check` to ensure `package.json` and `CHANGELOG.md` stay in lockstep before tagging.
- **Tagging:** Use `v<MAJOR.MINOR.PATCH>` (e.g., `v4.0.4`). Tags trigger `release-ga.yml`.

## 3. Standard Release Flow

1. **Prep (local):**
   - `pnpm install --frozen-lockfile`
   - `pnpm run release:version-check`
   - Update `CHANGELOG.md` Unreleased section and roll entries under the new version heading.
2. **Dry-run (CI) on PR:**
   - Open a PR. `release-train.yml` runs automatically to build packages, emit SBOMs (if script present), and generate provenance evidence bundles without publishing.
   - `release-integrity.yml` (PR trigger) produces SBOM, signs artifacts, runs mock scans, and evaluates OPA release gates.
3. **Cut the release tag:**
   - `git tag v<version>`; `git push origin v<version>`
   - Tagging triggers `release-ga.yml` which runs verification gates, builds signed server/client images via `_reusable-slsa-build.yml` (SLSA provenance + SBOM), and publishes a GitHub Release with evidence bundle.
4. **Post-release:**
   - Optionally run `make -f Makefile.release stage` then `make -f Makefile.release prod` to promote via Argo Rollouts once artifacts are verified.

## 4. Changelog and Release Notes

- Maintain `CHANGELOG.md` using Keep a Changelog format with an `Unreleased` section.
- Each release must move `Unreleased` entries under a dated `## [x.y.z] - YYYY-MM-DD` heading.
- GitHub Release notes are generated automatically via `release-ga.yml` (`generate_release_notes: true`); ensure PR titles and labels are accurate for deterministic output.

## 5. Evidence, SBOM, and Provenance

- **SBOM:** `release-train.yml` invokes `scripts/compliance/generate_sbom.sh` when present; `release-ga.yml` and `_reusable-slsa-build.yml` request SBOM generation for images.
- **Provenance:** `_reusable-slsa-build.yml` emits SLSA provenance for built images; `release-train.yml` collects evidence bundles via `scripts/compliance/generate_evidence.ts` when available.
- **Signatures:** Use `cosign verify` against GitHub OIDC identities for images built on tags; `release-integrity.yml` signs generated artifacts as part of the gate.
- **Storage:** GitHub Actions artifacts retain SBOMs and evidence for 90 days (`release-train.yml` and `release-ga.yml`). Download and archive externally for long-term retention when required.

## 6. Release Gates and Required Checks

- PRs: `release-train.yml`, `release-integrity.yml`, and `semver-label.yml` must be green before merging changes that affect release surfaces.
- Tags: `release-ga.yml` must succeed; it depends on successful verification, SLSA builds, and evidence bundle creation.
- Local sanity: `pnpm test` (or scoped tests for touched components) is required before tagging; include results in the release evidence.

## 7. Rollback and Patch Workflow

- **Patch:** Branch from the latest tag (`git checkout -b hotfix/<issue> vX.Y.Z`), apply minimal fix, rerun `make release-check`, and tag `vX.Y.(Z+1)`.
- **Rollback:**
  - Cancel/abort rollouts: `kubectl argo rollouts abort maestro-server-rollout -n <env>`.
  - Re-deploy prior artifact: retag or redeploy the previous image/tag via the `prod` target in `Makefile.release` after updating `IMAGE` to the prior digest.
  - Document the rollback in `release_logs.md` and append a changelog entry explaining the revert and follow-up.

## 8. Verification Commands (expected results)

- `pnpm run release:version-check` → passes when `package.json` and `CHANGELOG.md` share the same latest version and an `[Unreleased]` section exists.
- `gh workflow run release-train.yml --ref <branch>` → completes with artifacts `client-dist`, `server-dist`, `sbom-artifacts`, `evidence-bundle` (no registry push).
- `gh workflow run release-integrity.yml --ref <branch>` → OPA policy evaluation returns `true`.
- Optional local deploy smoke: `make -f Makefile.release stage` should complete with canary promotion after SLO checks.

## 9. Ownership and Updates

- Release engineering DRI: Release Captain (Codex/Jules). Keep this document in sync with workflow changes; if a workflow is modified, update the relevant sections and refresh the verification commands.
