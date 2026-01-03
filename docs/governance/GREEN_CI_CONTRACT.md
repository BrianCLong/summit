# Green CI Contract

> **Effectiveness:** Immediate
> **Enforcement:** `scripts/ci/ci-parity.sh`

## The Contract

To maintain a healthy monorepo, all code merged into `main` must adhere to the following strict contract.

### 1. The "Green" State
A branch is considered "Green" ONLY if the following command passes locally:

```bash
./scripts/ci/ci-parity.sh
```

This command runs:
1.  `pnpm install --frozen-lockfile` (Deterministic dependency resolution)
2.  `pnpm -r lint` (Static analysis)
3.  `pnpm -r typecheck` (Type safety)
4.  `pnpm -r build` (Artifact generation)
5.  `pnpm -r test` (Verification)

### 2. Zero-Tolerance Policies

*   **No "Works on My Machine":** If it fails `ci-parity.sh`, it is broken.
*   **No Pinned/Phantom Dependencies:** All dependencies must be declared in `package.json`. Relying on hoisted dependencies from the root is forbidden unless explicitly architected.
*   **No Deterministic Failures:** Tests must not depend on external network state (no real Stripe, no real OpenAI). Mock everything.
*   **No Singleton Leaks:** Tests must reset global state between runs.

### 3. Escalation Path

If `ci-parity.sh` fails due to environment issues (e.g., OOM, missing system libs):
1.  Check `docs/ops/P0P1_EXECUTION_BUNDLE.md` for known issues.
2.  Open an issue tagged `area/infra`.
3.  Do NOT bypass checks.

### 4. Adding New Code

*   **New Packages:** Must inherit root `tsconfig.base.json` and `eslint.config.js`.
*   **New Scripts:** Must be runnable via `pnpm <script>` from the root.
