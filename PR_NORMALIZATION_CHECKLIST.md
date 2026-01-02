# PR Normalization Checklist

## Pre-Submission
- [ ] **Atomic Scope**: Changes address a single issue or prompt.
- [ ] **Tests**: Unit tests added/updated (min 80% coverage).
- [ ] **Docs**: JSDoc/README updated.
- [ ] **Lint**: `pnpm lint` passes.
- [ ] **Build**: `pnpm build` passes.

## Review Gates
- [ ] **CI**: All checks green.
- [ ] **Security**: No new vulnerabilities (Trivy/Snyk).
- [ ] **Policy**: OPA policies pass.
- [ ] **Approval**: 1+ Code Owner approval.

## Post-Merge
- [ ] **Evidence**: Artifacts generated.
- [ ] **Cleanup**: Feature branch deleted.
