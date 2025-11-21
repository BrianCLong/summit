# Human-AI Collaboration Workflow

> Guidelines for effective human-AI partnership in Summit platform development

## Overview

This document establishes clear ownership patterns, autonomy levels, and collaboration workflows for the Summit platform strategic implementation. The goal is to maximize AI productivity while ensuring human oversight on critical decisions.

---

## Ownership Patterns

### H = Human-Led (Humans design/decide; AI generates boilerplate)

| Activity | Human Role | AI Role |
|----------|-----------|---------|
| Architecture decisions | Design, evaluate trade-offs, decide | Research options, document decisions |
| Policy semantics | Define rules, acceptance criteria | Generate Rego/YAML, test cases |
| UX/UI flows | Sketch wireframes, user stories | Implement components, accessibility |
| Risk acceptance | Evaluate security implications | Generate threat models, mitigations |
| Customer narratives | Define use cases, priorities | Generate documentation, examples |
| Data model design | Entity relationships, cardinality | Generate schemas, migrations |
| SLO definitions | Define targets, thresholds | Implement dashboards, alerts |

### A = AI-Heavy (AI drafts/maintains; humans validate)

| Activity | AI Role | Human Role |
|----------|---------|-----------|
| Test generation | Write unit/integration/E2E tests | Review coverage, edge cases |
| Documentation | Generate docs, ADRs, runbooks | Review accuracy, approve |
| Error messages | Draft user-friendly messages | Review tone, completeness |
| Refactoring | Identify opportunities, implement | Review changes, approve merge |
| Config generation | Generate YAML, JSON, Terraform | Validate correctness |
| Code formatting | Apply linting, formatting | N/A (auto-merge) |
| Dependency updates | Generate PRs for patches | Review breaking changes |
| Boilerplate code | Generate scaffolding | Review patterns |

### M = Mixed (AI scaffolds; humans define semantics)

| Activity | Collaboration Model |
|----------|---------------------|
| Schema migrations | Human defines fields/constraints; AI generates SQL/Cypher |
| Connector manifests | Human defines capabilities; AI implements SDK integration |
| DAG workflows | Human defines steps/gates; AI generates orchestration code |
| Telemetry setup | Human defines metrics/SLOs; AI instruments code |
| API contracts | Human defines endpoints; AI generates types, validation |

---

## Autonomy Levels

### Level 1: Auto-Merge (No human review required)

AI can iterate and merge autonomously for:

- **Linting/formatting fixes** - Code style enforcement
- **Dependency patches** - Non-breaking security updates
- **Documentation typos** - Spelling, grammar fixes
- **Test additions** - New tests for existing code (no behavior change)
- **Comment improvements** - Better code documentation
- **Config tweaks** - Non-sensitive configuration adjustments

**Safeguards:**
- CI must pass
- No changes to security-critical files
- No new dependencies
- Coverage cannot decrease

### Level 2: Human Review Required

Human must approve before merge:

- **New features** - Any new functionality
- **Schema changes** - Database migrations, API changes
- **Security changes** - Auth, authorization, encryption
- **Dependency additions** - New packages
- **Architecture changes** - Service boundaries, interfaces
- **Policy changes** - Authority rules, PII patterns
- **Performance changes** - Query optimizations, caching

**Review Guidelines:**
- Check for security implications
- Verify test coverage
- Ensure documentation updated
- Validate backward compatibility

### Level 3: Human-Led (AI assists only)

Human drives with AI support:

- **Architecture decisions** - AI researches, human decides
- **Policy definitions** - AI drafts, human approves semantics
- **UX flows** - AI prototypes, human validates
- **Risk assessment** - AI generates, human accepts/rejects
- **Customer-facing changes** - AI drafts, human approves tone
- **Incident response** - Human leads, AI assists diagnosis

---

## Workflow by Wave

### Wave 0: Baseline Stabilization

```
┌─────────────────────────────────────────────────────────────┐
│                     WAVE 0 WORKFLOW                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. AI generates canonical entity types (Level 2)           │
│     └─ Human reviews schema design                          │
│                                                              │
│  2. AI creates connector registry (Level 1)                 │
│     └─ Auto-merge JSON manifest                             │
│                                                              │
│  3. AI scaffolds authority compiler (Level 2)               │
│     └─ Human reviews policy schema                          │
│                                                              │
│  4. AI writes CLI doctor command (Level 1)                  │
│     └─ Auto-merge with CI passing                           │
│                                                              │
│  5. AI consolidates logging (Level 2)                       │
│     └─ Human reviews log format changes                     │
│                                                              │
│  6. AI adds test coverage thresholds (Level 1)              │
│     └─ Auto-merge CI config                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Wave 1: Council-Grade Core

```
┌─────────────────────────────────────────────────────────────┐
│                     WAVE 1 WORKFLOW                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Human defines authority policy semantics (Level 3)      │
│     └─ AI implements compiler, evaluator, middleware        │
│                                                              │
│  2. AI enhances PII detection patterns (Level 2)            │
│     └─ Human reviews pattern accuracy                       │
│                                                              │
│  3. AI implements copilot citations (Level 2)               │
│     └─ Human validates citation quality                     │
│                                                              │
│  4. AI scaffolds safety harness (Level 2)                   │
│     └─ Human defines red-team scenarios                     │
│                                                              │
│  5. AI generates provenance export (Level 2)                │
│     └─ Human reviews manifest format                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Wave 2: Production Hardening

```
┌─────────────────────────────────────────────────────────────┐
│                     WAVE 2 WORKFLOW                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Human defines SLOs (Level 3)                            │
│     └─ AI implements dashboards, alerts                     │
│                                                              │
│  2. AI implements chaos tests (Level 2)                     │
│     └─ Human reviews failure scenarios                      │
│                                                              │
│  3. AI creates connector certification tests (Level 2)      │
│     └─ Human defines pass/fail criteria                     │
│                                                              │
│  4. AI implements cost attribution (Level 2)                │
│     └─ Human validates cost model                           │
│                                                              │
│  5. AI generates DR runbooks (Level 1)                      │
│     └─ Auto-merge documentation                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Wave 3: Experience & Adoption

```
┌─────────────────────────────────────────────────────────────┐
│                     WAVE 3 WORKFLOW                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Human designs tri-pane UX (Level 3)                     │
│     └─ AI implements components                             │
│                                                              │
│  2. AI implements i18n infrastructure (Level 2)             │
│     └─ Human reviews locale handling                        │
│                                                              │
│  3. AI creates onboarding tutorials (Level 2)               │
│     └─ Human validates learning flow                        │
│                                                              │
│  4. AI generates accessibility fixes (Level 1)              │
│     └─ Auto-merge WCAG compliance                           │
│                                                              │
│  5. Human defines design tokens (Level 3)                   │
│     └─ AI generates component library                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Communication Protocols

### AI → Human

**When to escalate:**
- Security implications detected
- Breaking changes required
- Multiple valid approaches exist
- Customer-facing impact
- Policy/compliance questions
- Performance trade-offs

**How to escalate:**
```markdown
## Decision Required

**Context:** [Brief description of the situation]

**Options:**
1. [Option A] - Pros: ... Cons: ...
2. [Option B] - Pros: ... Cons: ...

**Recommendation:** [AI's suggested approach]

**Questions for Human:**
- [Specific question 1]
- [Specific question 2]
```

### Human → AI

**Clear task specification:**
```markdown
## Task: [Clear title]

**Objective:** [What should be accomplished]

**Constraints:**
- [Must do X]
- [Must not do Y]
- [Should consider Z]

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2

**Autonomy Level:** [1/2/3]

**Review Requirements:** [Who reviews, what to check]
```

---

## Success Metrics by Wave

### Wave 0 Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Golden path passes | 100% | `make smoke` success rate |
| Test coverage | ≥70% | Jest coverage report |
| Entity types defined | 8/8 | GraphQL schema check |
| Connector registry | 13/13 | JSON validation |
| CLI doctor validates | 100% | Health check pass rate |

### Wave 1 Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Authority enforcement | 100% | Integration tests |
| Copilot citations | ≥90% | Response audit |
| PII detection rate | ≥95% | Test suite |
| Provenance coverage | ≥80% | Audit log analysis |
| Safety harness scenarios | ≥50 | Red-team test count |

### Wave 2 Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| DR drill RTO | <4 hours | Drill execution time |
| Connector certification | 100% | Test suite pass rate |
| Cost attribution accuracy | ±5% | FinOps validation |
| p95 query latency | <500ms | Prometheus metrics |
| Chaos test coverage | ≥80% | Scenario count |

### Wave 3 Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| WCAG 2.1 AA compliance | 100% | Accessibility audit |
| Onboarding completion | ≥80% | User telemetry |
| Documentation coverage | ≥90% | Doc lint results |
| i18n locale support | ≥3 | Locale count |
| Design system coverage | ≥70% | Component usage |

---

## Quality Gates

### Before Merge (All Levels)

- [ ] CI pipeline passes
- [ ] No security vulnerabilities (Trivy)
- [ ] No secrets in code (gitleaks)
- [ ] Test coverage maintained
- [ ] Lint rules satisfied

### Before Deploy (Level 2+)

- [ ] Human review completed
- [ ] ADR written (if architectural)
- [ ] Documentation updated
- [ ] Changelog entry added
- [ ] Breaking changes documented

### Before Release

- [ ] All Wave metrics met
- [ ] Security review completed
- [ ] Performance benchmarks pass
- [ ] DR drill successful
- [ ] Customer documentation reviewed

---

## Escalation Matrix

| Issue Type | First Responder | Escalation |
|------------|-----------------|------------|
| Test failures | AI auto-fix | Human if repeated |
| Security alert | Human immediately | Security team |
| Performance regression | AI diagnosis | Human review |
| Customer impact | Human lead | Product team |
| Data integrity | Human lead | Data team |
| Policy violation | Human immediately | Compliance team |

---

## Related Documents

- [Strategic Implementation Roadmap](./STRATEGIC_IMPLEMENTATION_ROADMAP.md)
- [Governance Integration Points](./governance/INTEGRATION_POINTS.md)
- [ADR Template](../adr/ADR-template.md)
