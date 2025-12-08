# Developer Ergonomics (DX) Documentation

> **Mission**: Create a frictionless developer experience with fast feedback loops and clear golden paths.

## Contents

| Document | Description | Audience |
|----------|-------------|----------|
| [DEV_CLI_SPEC.md](./DEV_CLI_SPEC.md) | Unified `summit` CLI specification | All developers |
| [LOCAL_DEV_CONFIG.md](./LOCAL_DEV_CONFIG.md) | Docker profiles, secrets, customization | All developers |
| [ONBOARDING_CHECKLIST.md](./ONBOARDING_CHECKLIST.md) | New developer setup checklist | New hires |
| [GOLDEN_PATHS.md](./GOLDEN_PATHS.md) | Step-by-step workflows for common tasks | All developers |
| [PR_CONVENTIONS.md](./PR_CONVENTIONS.md) | Pull request guidelines and commit format | All developers |

## Quick Start

```bash
# Validate environment
summit doctor

# Bootstrap (first time)
summit bootstrap

# Start development
summit up

# Validate golden path
summit smoke
```

## Key Metrics

We track developer experience through:

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Time to first smoke | < 30 min | `make bootstrap && make up && make smoke` |
| Time to first contribution | < 4 hours | First merged PR |
| Dev environment reliability | > 99% | `summit doctor` success rate |
| Build time | < 5 min | `time summit build` |

## Getting Help

1. Check the relevant doc above
2. Run `summit doctor` to diagnose issues
3. Ask in #dev-help channel
4. Create an issue for persistent problems

## Contributing

To improve DX documentation:
1. Edit the relevant `.md` file
2. Test any commands you document
3. Submit PR with `docs(dx):` prefix
