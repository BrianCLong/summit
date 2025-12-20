# Plan Prompts 17-49: Platform Evolution Suite

> **Created**: 2025-11-25
> **Status**: Active
> **Owner**: Platform Engineering

This directory contains a comprehensive suite of plan prompts for evolving the Summit/IntelGraph platform across performance, security, observability, data, developer experience, and governance dimensions.

## Overview

| Prompt Range | Theme | Count |
|--------------|-------|-------|
| 17-25 | Performance, Reliability & Capacity | 9 |
| 26-30 | Security, Compliance & Governance | 5 |
| 31-35 | Observability, Analytics & Telemetry | 5 |
| 36-40 | Data, ML & Experimentation | 5 |
| 41-45 | Developer Experience & Accessibility | 5 |
| 46-49 | Governance & Platform Enablement | 4 |

**Total**: 33 prompts

## Quick Start

```bash
# Validate all prompts against schema
pnpm run prompts:validate

# Run a specific prompt
pnpm run prompts:run -- --id plan.performance-benchmark@v1

# Generate PR from prompt output
pnpm run prompts:pr -- --id plan.performance-benchmark@v1
```

## Phased Rollout Strategy

### Phase 1: Foundation (Prompts 17-22)
Establish performance baselines, security hardening, and observability foundations.

| Prompt | ID | Priority |
|--------|-----|----------|
| 17 | `plan.performance-benchmark@v1` | P0 |
| 18 | `plan.hot-path-profiling@v1` | P0 |
| 19 | `plan.load-testing@v1` | P0 |
| 20 | `plan.caching-strategy@v1` | P1 |
| 21 | `plan.resource-budgeting@v1` | P1 |
| 22 | `plan.observability-reliability@v1` | P0 |

### Phase 2: Hardening (Prompts 23-29)
Refine builds, licensing, SBOMs, and threat modeling.

| Prompt | ID | Priority |
|--------|-----|----------|
| 23 | `plan.build-artifact-optimization@v1` | P1 |
| 24 | `plan.canary-rollback@v1` | P0 |
| 25 | `plan.dependency-hygiene@v1` | P1 |
| 26 | `plan.security-baseline@v1` | P0 |
| 27 | `plan.threat-modeling@v1` | P0 |
| 28 | `plan.secrets-management@v1` | P0 |
| 29 | `plan.sbom-signing@v1` | P1 |

### Phase 3: Governance (Prompts 30-35)
Accelerate governance, analytics, and compliance.

| Prompt | ID | Priority |
|--------|-----|----------|
| 30 | `plan.license-compliance@v1` | P1 |
| 31 | `plan.metrics-taxonomy@v1` | P1 |
| 32 | `plan.distributed-tracing@v1` | P0 |
| 33 | `plan.log-management@v1` | P1 |
| 34 | `plan.realtime-analytics@v1` | P2 |
| 35 | `plan.anomaly-detection@v1` | P2 |

### Phase 4: Experience (Prompts 36-49)
Deepen data practices, DX, accessibility, and governance.

| Prompt | ID | Priority |
|--------|-----|----------|
| 36 | `plan.data-lineage@v1` | P1 |
| 37 | `plan.experimentation@v1` | P2 |
| 38 | `plan.mock-data-factory@v1` | P1 |
| 39 | `plan.model-reproducibility@v1` | P2 |
| 40 | `plan.data-privacy@v1` | P0 |
| 41 | `plan.dx-feedback@v1` | P2 |
| 42 | `plan.accessibility-automation@v1` | P1 |
| 43 | `plan.ux-guidelines@v1` | P2 |
| 44 | `plan.developer-portal@v1` | P2 |
| 45 | `plan.code-review-quality@v1` | P1 |
| 46 | `plan.policy-engine@v1` | P1 |
| 47 | `plan.platform-abstraction@v1` | P1 |
| 48 | `plan.documentation-qa@v1` | P1 |
| 49 | `plan.ownership-matrix@v1` | P0 |

## Acceptance Criteria Template

Each prompt produces deliverables validated by:

1. **Automated Checks** - CI gates pass
2. **Documentation** - README/runbook updated
3. **Tests** - Relevant test coverage
4. **Review** - PR approved by owner
5. **Rollback** - Documented rollback path

## Parallelization Notes

Prompts are designed to run independently. However, consider these dependency hints:

```
17 (benchmark) → 18 (profiling) → 20 (caching)
26 (security baseline) → 27 (threat model) → 28 (secrets)
31 (metrics) → 32 (tracing) → 35 (anomaly)
```

## File Structure

```
prompts/plans/
├── README.md                    # This file
├── _checklists/                 # Acceptance checklists
│   ├── performance.md
│   ├── security.md
│   ├── observability.md
│   ├── data.md
│   ├── dx.md
│   └── governance.md
├── performance/                 # Prompts 17-25
│   ├── plan.performance-benchmark@v1.yaml
│   ├── plan.hot-path-profiling@v1.yaml
│   └── ...
├── security/                    # Prompts 26-30
│   ├── plan.security-baseline@v1.yaml
│   └── ...
├── observability/               # Prompts 31-35
│   ├── plan.metrics-taxonomy@v1.yaml
│   └── ...
├── data/                        # Prompts 36-40
│   ├── plan.data-lineage@v1.yaml
│   └── ...
├── dx/                          # Prompts 41-45
│   ├── plan.dx-feedback@v1.yaml
│   └── ...
└── governance/                  # Prompts 46-49
    ├── plan.policy-engine@v1.yaml
    └── ...
```

## Contributing

When adding new prompts:

1. Follow the schema in `/prompts/schema.json`
2. Use naming convention: `plan.<domain>-<action>@v1.yaml`
3. Include at least 2 examples
4. Add acceptance criteria
5. Update this README

## Related Documentation

- [Architecture](../../docs/ARCHITECTURE.md)
- [Testing Strategy](../../docs/TESTPLAN.md)
- [Security Policies](../../SECURITY/)
- [Runbooks](../../RUNBOOKS/)
