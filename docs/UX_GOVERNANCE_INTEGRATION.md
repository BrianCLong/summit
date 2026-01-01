# UX Governance Integration

This document explains how the UX Governance System is integrated into the IntelGraph/Summit development workflow.

## Components

### 1. UX CI Enforcer

- **File**: `scripts/ux-ci-enforcer.js`
- **Purpose**: Validates all code changes against the authoritative UX doctrine
- **Execution**: Runs automatically in CI/CD pipeline
- **Blocking**: Fails builds that violate UX governance decisions

### 2. Machine-Readable UX Doctrine

- **Files**: `ux-doctrine.json` and `.ux-doctrine.schema.json`
- **Purpose**: Authoritative source of UX principles and requirements
- **Usage**: Referenced by CI enforcer and development tools

### 3. PR Template with Governance Rules

- **File**: `.github/PULL_REQUEST_TEMPLATE/ux-governance-check.md`
- **Purpose**: Ensures developers verify UX compliance before submitting PRs

### 4. UX Governance Orchestrator

- **File**: `scripts/ux-governance-orchestrator.js`
- **Purpose**: Runs complete four-agent analysis and produces decision packages
- **Usage**: For periodic governance reviews and decision updates

## CI/CD Integration

The UX CI Enforcer is integrated into the CI pipeline via the following configuration in `.github/workflows/`:

```yaml
- name: UX Governance Check
  run: node scripts/ux-ci-enforcer.js
```

## Running the Governance System

### Perform a Complete UX Governance Review:

```bash
node scripts/ux-governance-orchestrator.js
```

### Validate Current Codebase Against UX Doctrine:

```bash
node scripts/ux-ci-enforcer.js
```

### Update UX Doctrine from New Analysis:

```bash
node scripts/ux-governance-orchestrator.js && git add ux-doctrine.json ux-governance-report.json
```

## Decision Package

After running the orchestrator, a complete decision package is created at `ux-governance-report.json` containing:

- Executive summary
- Canonical issue register
- Resolved conflict log
- Single ordered backlog
- Authoritative UX doctrine
- Implementation-ready changes
- Acceptance criteria
