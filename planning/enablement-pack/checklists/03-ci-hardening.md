# Prompt 3: CI Hardening Checklist

- [ ] **Audit**: Review existing `.github/workflows`.
- [ ] **Parallelize**:
    - [ ] Create matrix strategy for subsystems A, B, C, D.
- [ ] **Cache**:
    - [ ] Implement `actions/cache` for npm/yarn/pnpm, pip, go modules.
- [ ] **Isolation**:
    - [ ] Ensure subsystem tests don't bleed state.
- [ ] **Aggregation**:
    - [ ] Add step to summarize results (e.g., JUnit report).
- [ ] **Verification**:
    - [ ] CI time reduced or flat.
    - [ ] Flakiness reduced.
