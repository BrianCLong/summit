# MVP4 RC Cut Runbook

This runbook defines the deterministic steps to cut an MVP4 Release Candidate (RC) tag and prepare
promotion artifacts. It is aligned to existing release tooling and the Summit Readiness Assertion.

## Preconditions (must be green)

1. **Readiness assertion acknowledged**

   **Command:**

   ```bash
   sed -n '1,200p' docs/SUMMIT_READINESS_ASSERTION.md
   ```

   **Verify:**

   ```bash
   rg -n "Readiness" docs/SUMMIT_READINESS_ASSERTION.md
   ```

2. **Clean working tree**

   **Command:**

   ```bash
   git status --porcelain=v1
   ```

   **Verify:**

   ```bash
   git status --porcelain=v1 | wc -l
   ```

3. **Correct branch and up-to-date**

   **Command:**

   ```bash
   git rev-parse --abbrev-ref HEAD
   git fetch origin
   ```

   **Verify:**

   ```bash
   git rev-list --left-right --count origin/$(git rev-parse --abbrev-ref HEAD)...HEAD
   ```

## Version + Changelog (required)

1. **Generate release changelog**

   **Command:**

   ```bash
   ./scripts/release/generate_changelog.sh --prepend
   ```

   **Verify:**

   ```bash
   rg -n "^## \[" CHANGELOG.md | head -n 5
   ```

2. **Align release versions (root/server/client)**

   **Command:**

   ```bash
   rg -n "\"version\"" package.json server/package.json client/package.json
   ```

   **Verify:**

   ```bash
   node -e "const fs=require('fs'); const paths=['package.json','server/package.json','client/package.json']; const versions=paths.map(p=>JSON.parse(fs.readFileSync(p,'utf8')).version); console.log(versions.join(' / '));"
   ```

3. **Sync lockfiles**

   **Command:**

   ```bash
   pnpm install
   ```

   **Verify:**

   ```bash
   git status --porcelain=v1
   ```

## Policy Validation Gates (no failures)

1. **Release policy validation**

   **Command:**

   ```bash
   node scripts/release/validate-release-policy.mjs
   ```

   **Verify:**

   ```bash
   node scripts/release/build-release-status.mjs
   ```

2. **Governance policy validation**

   **Command:**

   ```bash
   ./scripts/release/validate_governance_policies.sh
   ```

   **Verify:**

   ```bash
   ./scripts/release/check_governance_compliance.sh --verbose
   ```

3. **Freeze gate check**

   **Command:**

   ```bash
   node scripts/release/check-freeze.mjs
   ```

   **Verify:**

   ```bash
   cat dist/release/freeze.json
   ```

## Test Gates (RC readiness)

1. **Release scripts test suite**

   **Command:**

   ```bash
   pnpm test:release-scripts
   ```

   **Verify:**

   ```bash
   cat dist/release/verify.json
   ```

2. **Release integrity check**

   **Command:**

   ```bash
   ./scripts/verify-release.sh
   ```

   **Verify:**

   ```bash
   rg -n "Release verification complete|Error" dist/release/verify.json scripts/verify-release.sh
   ```

3. **Release readiness gate**

   **Command:**

   ```bash
   pnpm release:ready
   ```

   **Verify:**

   ```bash
   ./scripts/release/verify-green-for-tag.sh --tag vX.Y.Z-rc.N --commit $(git rev-parse HEAD)
   ```

## RC Tagging Procedure

1. **Create annotated RC tag**

   **Command:**

   ```bash
   git tag -a vX.Y.Z-rc.N -m "MVP4 RC vX.Y.Z-rc.N"
   ```

   **Verify:**

   ```bash
   git tag --list "vX.Y.Z-rc.N"
   ```

2. **Push RC tag**

   **Command:**

   ```bash
   git push origin vX.Y.Z-rc.N
   ```

   **Verify:**

   ```bash
   git ls-remote --tags origin | rg "vX.Y.Z-rc.N"
   ```

## Promotion Bundle (RC → GA)

1. **Generate promotion bundle**

   **Command:**

   ```bash
   ./scripts/release/build-promotion-bundle.sh --tag vX.Y.Z-rc.N --commit $(git rev-parse HEAD)
   ```

   **Verify:**

   ```bash
   ls -la artifacts/promotion-bundles/vX.Y.Z-rc.N
   ```

2. **Verify promotion checks**

   **Command:**

   ```bash
   ./scripts/release/verify-green-for-tag.sh --tag vX.Y.Z-rc.N --commit $(git rev-parse HEAD)
   ```

   **Verify:**

   ```bash
   ./scripts/release/verify-green-for-tag.sh --tag vX.Y.Z-rc.N --commit $(git rev-parse HEAD) | tail -n 5
   ```

## GA Bundle (for promotion readiness)

1. **Build GA bundle (dry run optional)**

   **Command:**

   ```bash
   ./scripts/release/build-ga-bundle.sh --tag vX.Y.Z --sha $(git rev-parse HEAD)
   ```

   **Verify:**

   ```bash
   ls -la artifacts/ga-bundles/vX.Y.Z
   ```

2. **Verify GA release bundle**

   **Command:**

   ```bash
   ./scripts/release/verify_release_bundle.sh --bundle-dir artifacts/ga-bundles/vX.Y.Z
   ```

   **Verify:**

   ```bash
   test -f artifacts/ga-bundles/vX.Y.Z/SHA256SUMS
   ```

## Rollback Procedure

1. **Delete RC tag (local + remote)**

   **Command:**

   ```bash
   git tag -d vX.Y.Z-rc.N
   git push origin :refs/tags/vX.Y.Z-rc.N
   ```

   **Verify:**

   ```bash
   git ls-remote --tags origin | rg "vX.Y.Z-rc.N" || true
   ```

2. **Release rollback script**

   **Command:**

   ```bash
   ./scripts/release/rollback_release.sh --tag vX.Y.Z-rc.N
   ```

   **Verify:**

   ```bash
   cat dist/release/release-status.json
   ```
