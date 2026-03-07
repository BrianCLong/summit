# Platform-First Dependency Rubric

## Summit Readiness Assertion Alignment

This policy operationalizes platform readiness by requiring browser-native APIs first, then controlled exceptions. Managed deviations are governed exceptions, not ad-hoc bypasses.

## Decision Rubric (Required Before Adding Browser Runtime Dependencies)

1. **Native API Check**
   - Verify whether a Web Platform API exists for the capability.
   - Priority APIs: `structuredClone`, `Performance`, `Page Visibility`, `ResizeObserver`, `IntersectionObserver`, `AbortController`, `BroadcastChannel`, `Idle Detection`, `Web Locks`, `File System Access`.
2. **Compatibility Classification**
   - Classify as `universal-ish` or `chromium-centric`.
   - `chromium-centric` requires a tested fallback and default-off integration.
3. **Security & Privacy Review**
   - Permissioned APIs (Idle Detection, File System Access) require explicit user action and deny-by-default behavior.
4. **Evidence Requirement**
   - Add or update evidence under `evidence/browser-apis/` and register IDs in `evidence/index.json`.
5. **Exception Process**
   - If adding a dependency that duplicates native capability, document:
     - why native APIs are insufficient,
     - compatibility impact,
     - measurable performance/security tradeoffs,
     - rollback path.

## Governance Gates

- Dependency-delta report must be produced for PRs that modify `pnpm-lock.yaml`.
- New browser runtime dependencies must be acknowledged in `.github/policies/platform-first-deps.json`.
- Fallback tests are mandatory for chromium-centric APIs.

## Required Artifacts

- `evidence/browser-apis/report.json`
- `evidence/browser-apis/metrics.json`
- `evidence/browser-apis/stamp.json`
- `artifacts/deps-delta.json` (CI output)
