# 1.3 REPO REALITY CHECK

### ASSUMED STRUCTURE

```
src/
  api/
    graphql/
    rest/
  agents/
  connectors/
  graphrag/

tests/

.github/workflows/
```

### New modules proposed

```
src/graphrag/omics/
src/graphrag/omics/deconvolution/
src/graphrag/omics/integrators/
src/graphrag/omics/models/
```

### CI gates (ASSUMPTION)

```
.github/workflows/ci-core.yml
.github/workflows/ci-verify.yml
.github/workflows/ci-security.yml
```

### Must-not-touch files

```
src/api/**
src/connectors/**
.github/workflows/ci-core.yml
```

### Validation checklist
1. Confirm `src/graphrag/` namespace exists: It does not exist natively, creating it for this implementation.
2. Confirm ML deps allowed: Using native TS without external Python ML deps for MVP.
3. Verify test runner: Using native vitest/jest available in the workspace.
4. Check artifact output format: Outputting JSON artifacts as requested.
