# Summit Intel MVP

Minimal architecture intelligence toolkit that powers four demos with one shared analysis engine:

1. Repository Intelligence
2. PR Architecture Copilot
3. Architecture Time Machine
4. CI Failure Prediction

## Run CLI

```bash
pnpm exec node summit-intel/cli/summit-intel.js .
pnpm exec node summit-intel/cli/summit-intel.js . --html
```

## Run PR Copilot script

```bash
pnpm exec node summit-intel/github/pr-copilot.js
```

## Run tests

```bash
node --test summit-intel/test/*.test.js
```
