# Prompt 6: Quality Gates Checklist

- [ ] **Linting Configs**:
    - [ ] `.eslintrc.js` / `tsconfig.json` (TS).
    - [ ] `.pylintrc` / `pyproject.toml` (Python).
    - [ ] `.golangci.yml` (Go).
- [ ] **Pre-commit**:
    - [ ] Add hooks for formatting (Prettier, Black, Gofmt).
    - [ ] Add hooks for linting.
- [ ] **CI Integration**:
    - [ ] Add "Lint" job to CI pipeline.
- [ ] **Verification**:
    - [ ] Badly formatted code fails commit/CI.
