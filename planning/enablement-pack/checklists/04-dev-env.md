# Prompt 4: Dev Environment Checklist

- [ ] **Devcontainer**:
    - [ ] Create `.devcontainer/devcontainer.json`.
    - [ ] Create `Dockerfile` if needed.
- [ ] **Tooling**:
    - [ ] Include Node.js, Python, Go runtimes.
    - [ ] Include DB clients (psql, etc.).
- [ ] **Documentation**:
    - [ ] Add "Open in Dev Container" badge/instructions to README.
- [ ] **Verification**:
    - [ ] `devcontainer build` succeeds.
    - [ ] `npm test`, `pytest`, `go test` run inside container.
