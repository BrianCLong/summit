---
id: feature-implementation
name: Feature Implementation Template
version: 1.0.0
category: core
type: feature
description: Comprehensive template for implementing new features from requirements to production
author: IntelGraph Team
lastUpdated: 2025-11-27T00:00:00Z
tags:
  - feature
  - implementation
  - full-stack
  - production-ready
metadata:
  priority: P2
  estimatedTokens: 3000
  complexity: maximal
variables:
  - name: featureName
    type: string
    description: Feature name
    required: true
    prompt: "What is the feature name?"
  - name: featureDescription
    type: multiline
    description: Detailed feature description
    required: true
    prompt: "Describe the feature in detail:"
  - name: userStory
    type: string
    description: User story
    required: true
    prompt: "User story (As a... I want... So that...)?"
  - name: acceptanceCriteria
    type: multiline
    description: Acceptance criteria
    required: true
    prompt: "Acceptance criteria (one per line):"
  - name: priority
    type: string
    description: Feature priority
    default: P2
    validation:
      enum: [P0, P1, P2, P3, P4]
  - name: targetRelease
    type: string
    description: Target release
    required: true
    prompt: "Target release? (e.g., 'v1.5.0' or '2025-12-01')"
  - name: stackAreas
    type: string
    description: Stack areas affected
    default: "Frontend, Backend, Database, API"
    prompt: "Stack areas affected?"
  - name: dependencies
    type: string
    description: Known dependencies or blockers
    default: "None identified"
    prompt: "Dependencies or blockers?"
  - name: complexity
    type: string
    description: Implementation complexity
    default: maximal
    validation:
      enum: [minimal, moderate, maximal]
---
# 🚀 Feature Implementation — Comprehensive AI Assistant Prompt

## Prime Directive

You are an autonomous, high-capability development agent building **{{featureName}}**. Your mission is to deliver the most complete, elegant, high-performance, fully realized implementation. Perform maximal extrapolation of all explicit and implicit requirements through the 7th order of implication.

---

## 1. Feature Overview

### Name
**{{featureName}}**

### Description
{{featureDescription}}

### User Story
{{userStory}}

### Priority & Timeline
* Priority: {{priority}}
* Target Release: {{targetRelease}}
* Stack Areas: {{stackAreas}}
* Dependencies: {{dependencies}}

---

## 2. Acceptance Criteria

{{acceptanceCriteria}}

---

## 3. Implementation Requirements

### Technical Excellence

1. **Architecture**
   * Clean, modular, scalable design
   * Follow SOLID principles
   * Align with existing codebase patterns (see CLAUDE.md)
   * Use appropriate design patterns

2. **Code Quality**
   * TypeScript with strict typing
   * Comprehensive error handling
   * Performance-optimized
   * Security-hardened (no XSS, injection, etc.)
   * Accessibility compliant (WCAG 2.1 AA)

3. **Testing**
   * Unit tests (Jest + React Testing Library)
   * Integration tests
   * E2E tests (Playwright) for critical paths
   * Minimum 80% code coverage
   * Test edge cases, errors, loading states

4. **Documentation**
   * Inline code comments (where needed)
   * API documentation
   * Component documentation
   * Architecture decision records (ADRs) if needed
   * Update README if needed

5. **Observability**
   * Structured logging
   * OpenTelemetry tracing
   * Prometheus metrics
   * Error tracking
   * Performance monitoring

6. **Security & Compliance**
   * Input validation
   * Authentication/authorization checks
   * Audit logging
   * Data classification
   * OPA policy enforcement

---

## 4. Implementation Phases

### Phase 1: Analysis & Design (Required Output)

1. **Requirements Analysis**
   * Explicit requirements
   * 1st → 7th order implications
   * Hidden requirements
   * Future extensibility needs

2. **Architecture Design**
   * Component diagram (text-based)
   * Data flow diagram
   * API contracts
   * Database schema changes
   * Dependency graph

3. **Technical Decisions**
   * Technology choices
   * Design patterns
   * Trade-offs considered
   * Performance considerations
   * Security considerations

### Phase 2: Implementation (Required Output)

1. **Database Layer**
   * Schema migrations (PostgreSQL + Neo4j)
   * ORM models (Prisma)
   * Seed data
   * Migration rollback scripts

2. **Backend/API Layer**
   * GraphQL schema updates
   * Resolvers
   * Services / business logic
   * Data access layer
   * Middleware
   * Error handlers

3. **Frontend Layer**
   * React components
   * Hooks
   * State management (Apollo Client)
   * Routing
   * Forms & validation
   * UI/UX polish

4. **Integration**
   * API integration
   * Real-time updates (GraphQL subscriptions)
   * Caching strategy
   * Error boundaries

### Phase 3: Quality Assurance (Required Output)

1. **Testing**
   * Unit test suite
   * Integration test suite
   * E2E test suite
   * Performance tests
   * Security tests

2. **Code Quality**
   * ESLint clean
   * TypeScript strict mode
   * Prettier formatted
   * No console.log/debugger
   * Code review checklist

3. **Performance**
   * Bundle size analysis
   * Lighthouse scores (>90 all metrics)
   * Load testing results
   * Query optimization

### Phase 4: Deployment (Required Output)

1. **CI/CD**
   * GitHub Actions workflow updates
   * Docker image builds
   * Kubernetes manifests
   * Helm chart updates

2. **Documentation**
   * Feature documentation
   * API documentation
   * Deployment guide
   * Runbook updates

3. **Observability**
   * Grafana dashboards
   * Prometheus alerts
   * Log aggregation setup
   * APM configuration

4. **Release**
   * Release notes
   * Migration guide
   * Rollback plan
   * Feature flags (if applicable)

---

## 5. Deliverables

Provide the following in your response:

### A. Analysis Document

```markdown
# {{featureName}} - Technical Analysis

## Requirements Analysis
- Explicit requirements: ...
- 1st-7th order implications: ...
- Hidden requirements discovered: ...

## Architecture
[Diagrams, component descriptions]

## Technical Decisions
[Choices made, rationale, trade-offs]

## Risk Assessment
[Risks, mitigations, contingencies]
```

### B. Implementation

For each file created or modified:

1. File path
2. Purpose/description
3. Full content (using Write or Edit tools)
4. Key implementation notes

Organize by layer:
* **Database**: migrations, models
* **Backend**: GraphQL schema, resolvers, services
* **Frontend**: components, hooks, pages
* **Tests**: unit, integration, e2e
* **Config**: CI/CD, deployment

### C. Test Suite

* Test plan
* Test files with full coverage
* Test execution proof (`pnpm test` output)
* Coverage report

### D. Documentation

* Feature README
* API docs
* Architecture diagrams
* ADRs (if needed)
* Runbook updates

### E. Deployment Package

* CI/CD workflow
* Docker/Kubernetes configs
* Deployment checklist
* Rollback procedure
* Monitoring/alerting setup

### F. Quality Report

* Code quality metrics
* Test coverage report
* Performance benchmarks
* Security scan results
* Accessibility audit

---

## 6. Standards & Conventions

**Must follow**:

* CLAUDE.md conventions (imports, formatting, testing, git)
* Golden Path: `make bootstrap && make up && make smoke`
* Conventional Commits
* TypeScript strict mode
* ESLint + Prettier
* pnpm workspace patterns
* Turbo build caching

**Must NOT**:

* Skip tests
* Skip documentation
* Introduce security vulnerabilities
* Break existing functionality
* Bypass CI checks
* Commit secrets
* Use `any` types excessively

---

## 7. Verification Checklist

Before submitting, verify:

* [ ] All acceptance criteria met
* [ ] Tests pass (`pnpm test`)
* [ ] Type checking passes (`pnpm typecheck`)
* [ ] Linting passes (`pnpm lint`)
* [ ] Smoke tests pass (`make smoke`)
* [ ] No security vulnerabilities (`pnpm security:scan`)
* [ ] Code coverage ≥ 80%
* [ ] Performance benchmarks met
* [ ] Accessibility audit passed
* [ ] Documentation complete
* [ ] CI/CD pipeline green
* [ ] Deployment artifacts ready
* [ ] Rollback plan documented

---

## 8. Output Format

Structure your response as:

1. **Executive Summary** (2-3 paragraphs)
2. **Analysis Document** (requirements, architecture, decisions)
3. **Implementation** (all code, organized by layer)
4. **Test Suite** (all tests with coverage)
5. **Documentation** (feature docs, API docs, ADRs)
6. **Deployment Package** (CI/CD, configs, procedures)
7. **Quality Report** (metrics, benchmarks, audits)
8. **Verification Checklist** (with confirmations)
9. **Next Steps** (optional improvements, future work)

---

**Remember**: Production-ready means **fully realized, battle-tested, and ready to ship**. No TODOs, no placeholders, no shortcuts. 🚀
