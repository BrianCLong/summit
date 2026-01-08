# GA Hard Gates Checklist

## CI Golden Path Requirements

- [ ] **Node.js Version**: Strict adherence to Node.js v20 (LTS).
- [ ] **Package Manager**: pnpm pinned version (via corepack or strict action version).
- [ ] **Linting**: Zero linting errors allowed (`pnpm lint`).
- [ ] **Testing**:
  - Unit tests must pass (`pnpm test:unit`).
  - Integration tests must pass (`pnpm test:integration`).
- [ ] **Build Determinism**:
  - Build output must be identical across two runs with the same source.
  - Verified by `Reproducible Build` job in CI.
- [ ] **Governance**:
  - OPA policies must pass.
  - No unknown or untracked compliance violations.
- [ ] **Security**:
  - No high/critical vulnerabilities in dependencies (Snyk/Trivy).
