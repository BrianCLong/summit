# CI/CD Superprompt — Fully Green Pipeline or Do Not Ship

Every deliverable MUST:

- Maintain full CI/CD health
- Maintain artifact signing pathways
- Maintain provenance and SBOM generation
- Maintain caching correctness
- Maintain test matrix compatibility
- Maintain release pipeline behavior
- Maintain merge train health
- Produce deterministic test runs

---

## Mandatory Questions

*All must be YES:*

- Will typecheck pass?
- Will lint pass?
- Will tests pass deterministically?
- Will CI be green on the first run?
- Will GitHub Actions workflows behave correctly?
- Will this merge cleanly onto main?
- Does the solution satisfy 1st/2nd/3rd-order requirements?

If **ANY** answer is NO → revise.

---

## CI Pipeline Stages

### 1. Install & Cache

```yaml
- name: Install dependencies
  run: pnpm install --frozen-lockfile
  env:
    TURBO_CACHE_DIR: .turbo
```

### 2. Build & Typecheck

```yaml
- name: Build
  run: pnpm build
- name: Typecheck
  run: pnpm typecheck
```

### 3. Lint & Format

```yaml
- name: Lint
  run: pnpm lint
- name: Format check
  run: pnpm format:check
```

### 4. Test

```yaml
- name: Unit tests
  run: pnpm test:jest
- name: Integration tests
  run: pnpm test:integration
- name: E2E tests
  run: pnpm e2e
```

### 5. Security Scan

```yaml
- name: Security audit
  run: pnpm audit
- name: Secret scan
  run: gitleaks detect
```

---

## Quality Gates

### Pre-merge

- [ ] All tests passing
- [ ] Code coverage meets threshold
- [ ] Security scan clean
- [ ] No new vulnerabilities
- [ ] Documentation updated

### Post-merge

- [ ] Main branch green
- [ ] Release artifacts generated
- [ ] SBOM published
- [ ] Deployment verified

---

## Failure Recovery

### On CI Failure

1. **Stop** - Do not merge
2. **Diagnose** - Check logs for root cause
3. **Fix** - Address the issue locally
4. **Verify** - Re-run failing tests locally
5. **Push** - Push fix and verify CI green

### Common Failures

| Issue | Cause | Fix |
|-------|-------|-----|
| Type error | Missing types | Add explicit types |
| Lint error | Style violation | Run `pnpm lint:fix` |
| Test flake | Race condition | Add proper waits/mocks |
| OOM | Large test suite | Increase memory, parallelize |

---

## EXECUTE.
