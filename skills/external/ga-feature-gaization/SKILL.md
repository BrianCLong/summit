---
name: ga-feature-gaization
description: "Develop a structured prompt and workflow to discover experimental/orphaned/underdeveloped features and drive them to GA readiness with production-grade quality, testing, documentation, and release governance. Use when asked to craft GA uplift prompts, feature discovery audits, or end-to-end GA readiness plans."
---

# GA Feature Discovery → GA Readiness Prompt Builder

## Purpose

Produce a complete, GA-ready prompt and execution plan for taking experimental, orphaned, or underdeveloped features to General Availability in Summit/IntelGraph environments.

## Quick Use

1. Confirm scope, repository, and timeline.
2. Generate the prompt using the template below.
3. Tailor outputs for Summit governance (evidence-first, readiness assertion, tests, rollback).

## Required Inputs

- Repository path or URL
- Target timeline (e.g., 4–8 weeks)
- Priority constraints (security, user-facing, cost, etc.)
- Known feature candidates (optional)

## Output Requirements

- Use evidence-first language and cite files when asked for repo-specific results.
- Require GA gates, tests, docs, and rollback plans.
- Ensure decisions are reversible with explicit triggers.

## Prompt Template (fill-in)

```
Objective
Identify an experimental, orphaned, or underdeveloped feature within [PROJECT_NAME] and develop it to GA status with production-ready quality, comprehensive testing, documentation, and enterprise-grade reliability.

Phase 1: Discovery and Assessment
Task: Conduct a comprehensive audit to identify candidate features.
Search Criteria:
1. Experimental features (feature flags, beta tags, experimental annotations)
2. Orphaned features (no commits in >6 months, missing ownership)
3. Underdeveloped features (incomplete implementation, missing tests/docs)

Analysis Requirements:
- Review codebase for TODOs, feature flags, experimental branches
- Analyze commit history for stale/abandoned work
- Examine test coverage gaps
- Review issue tracker for blocked/postponed features
- Assess user feedback and feature request data

Deliverable:
- Prioritized list with: feature name/location, current state (%), test coverage, doc status, business value, tech debt score, GA effort estimate

Phase 2: Feature Selection and Planning
Selection Criteria (rank 1–10):
- User demand/business value
- Technical feasibility
- Strategic alignment
- Risk of breaking changes
- Dependencies/blockers

Planning Deliverables:
1) Technical specification (scope, architecture, integration points, API contracts, security/compliance, performance/SLA)
2) Gap analysis (missing functionality, tests, docs, infra, observability)
3) Roadmap (milestones, acceptance criteria, timelines, risks, mitigation)

Phase 3: Development to GA Standards
Code Quality:
- Refactor to production quality
- Remove feature flags or add migration path
- Handle edge cases + errors
- Add instrumentation
- Optimize performance
- Security review

Testing (target ≥80% coverage):
- Unit, integration, E2E, perf, security, regression, chaos

Documentation:
- API docs, user docs, ADRs, runbooks, migration guides

Infrastructure & Operations:
- CI/CD integration
- Monitoring & alerts
- SLO/SLA definitions
- Rollback procedures
- Controlled rollout (feature flags/canary)

Compliance & Security:
- Threat modeling, privacy assessment, access control, audit logging, encryption

Phase 4: Pre-GA Validation
- Beta cohort + feedback loop
- GA readiness checklist (all criteria met, perf/security validated, stakeholder sign-off)

Phase 5: Launch and Post-GA
- Production deployment, release notes, comms
- 30-day monitoring, retros, triage

Success Metrics
- Adoption, latency/throughput, error rates, user satisfaction, business impact

Execution Guidelines
For AI agents:
- Static analysis, test generation, doc automation, incremental PRs
For humans:
- Assign DRI, weekly reviews, pair programming on complex refactors
```

## Summit-Specific Enhancements

- Reference `docs/SUMMIT_READINESS_ASSERTION.md` for readiness framing.
- Align with governance in `docs/governance/CONSTITUTION.md` and `docs/governance/META_GOVERNANCE.md`.
- Require evidence artifacts for tests and GA gates.
- Declare MAESTRO threat modeling layers when designing new systems.

## Completion Criteria

- Prompt includes all phases and deliverables.
- Prompt mandates test evidence, rollback plan, and explicit GA gates.
- Output leaves no open ends.
