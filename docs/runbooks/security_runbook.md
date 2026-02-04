# Security Runbook (GA Demo)

## Purpose

Run the security scanners, interpret results, and prepare a safe security PR.

## Prerequisites

- `pnpm` installed and dependencies available (`pnpm install`).
- Local tooling: `gitleaks` and `trivy` (or access to CI runners that provide them).
- Access to the repo root with a clean working tree.

## Run Scanners

### 1) Secrets scan (gitleaks)

```bash
./scripts/ci/scan_secrets.sh
```

**Expected output**

- `gitleaks` reports `0 leaks` or prints `No leaks detected`.

### 2) Dependency and filesystem scan (trivy)

```bash
trivy fs --exit-code 1 --severity HIGH,CRITICAL .
```

**Expected output**

- No HIGH/CRITICAL findings. Trivy exits with code `0`.

### 3) Secure baseline checks

```bash
pnpm lint
pnpm test:unit
```

**Expected output**

- Lint passes with zero warnings.
- Unit tests complete without failures.

## Interpret Results

- **Secrets findings**: Any credential, token, or private key finding is a hard stop. Remove the secret, rotate it, and re-run `scan_secrets.sh` until clean.
- **Vulnerability findings**: HIGH/CRITICAL issues block release. Pin or upgrade the dependency and re-run `trivy`.
- **Lint/test failures**: Treat as release-blocking regressions; resolve before proposing the PR.

## Contribute a Safe Security PR

1. Create a branch scoped to the security fix.
   ```bash
   git checkout -b fix/security/<short-desc>
   ```
2. Implement the fix and include evidence.
   - Capture scanner output logs (attach in PR description).
3. Re-run the scanners and lint/tests above.
4. Update `docs/roadmap/STATUS.json` with the security runbook change note.
5. Open the PR with the metadata block and verification plan filled.

## Common Failure Modes

- **`gitleaks` not installed**: `scan_secrets.sh` warns and skips. Install `gitleaks` or run in CI where it is installed.
- **`trivy` DB download fails**: Re-run after network access is restored, or use cached DB with `TRIVY_CACHE_DIR`.
- **HIGH/CRITICAL findings**: Confirm the path and dependency tree; upgrade or remove the offending package.
- **Lint/test failures**: Use `pnpm lint` and `pnpm test:unit` output to locate the failing file and fix before retry.
