# ADR-0014: Adopt Golden Path Platform for Service Development

## Status

**Proposed** → Under Review

## Context

CompanyOS has grown to include 150+ services across multiple teams. This growth has led to:

1. **Inconsistent service structures** - Each team has developed their own conventions, making cross-team collaboration difficult and increasing cognitive load when moving between projects.

2. **Duplicated CI/CD configurations** - Teams copy-paste workflows with varying quality, leading to security gaps and maintenance burden when platform capabilities evolve.

3. **Observability gaps** - Not all services export consistent metrics, use structured logging, or define SLOs, making incident response and capacity planning unreliable.

4. **Security drift** - Without standardized policy enforcement, services have varying levels of security hardening, secret management, and vulnerability scanning.

5. **Slow onboarding** - New team members spend weeks understanding different patterns across services rather than delivering value.

6. **Governance overhead** - Compliance and security teams must audit each service individually, consuming significant engineering resources.

The platform lacked a unified, opinionated approach that makes the **right thing the easy thing** while still allowing flexibility for legitimate edge cases.

## Decision

We will implement a **Golden Path Platform** consisting of:

### 1. Standard Service Archetypes

Define five canonical service types with explicit defaults:

| Type | Runtime | SLO Target | Key Features |
|------|---------|------------|--------------|
| **API Service** | Node.js 20 / Go 1.22 | 99.9% avail, p99 <500ms | REST/GraphQL, rate limiting, auth |
| **Worker Service** | Node.js 20 / Python 3.11 | 99.9% success, p95 <30s | Queue consumption, DLQ handling |
| **Batch Job** | Python 3.11 | 99% completion | CronJob, data processing |
| **Data Service** | Node.js 20 | 99.95% avail, p99 <100ms | Database access, migrations |
| **Frontend** | React 18 / Next.js 14 | Core Web Vitals | SPA, SSR, edge caching |

### 2. Scaffold CLI

A `companyos create` CLI that generates new services with:

- Pre-configured directory structure
- TypeScript/ESLint/Prettier configuration
- Health endpoints (`/health`, `/health/ready`, `/health/live`)
- Prometheus metrics (`/metrics`)
- OpenTelemetry instrumentation
- SLO definitions (`slos/slos.yaml`)
- Grafana dashboard (`dashboards/grafana.json`)
- OPA policy stubs (`policies/authz.rego`)
- CI workflow calling reusable templates
- Dockerfile with multi-stage builds
- Test infrastructure (Jest/pytest)
- Documentation templates

### 3. Paved-Road CI/CD

A composable pipeline with required and conditional stages:

```
Lint → Test → Security → Build → Publish → Deploy → Verify → Promote → Monitor
```

**Required Gates** (cannot bypass):
- Secret detection (Gitleaks)
- Critical CVE blocking (Trivy)
- Image signature verification (Cosign)
- OPA policy validation
- Health check verification

**Conditional Gates** (tier-based):
- Coverage thresholds (90%/80%/70% by tier)
- Canary analysis duration
- Soak test requirements
- Manual approval gates

### 4. Policy-as-Code Governance

OPA/Rego policies enforcing:
- ABAC authorization patterns
- Zero-trust networking defaults
- Deployment freeze compliance
- Error budget protection
- Breaking change requirements

### 5. Opt-Out with Guardrails

Teams can request exceptions via documented process:
1. File exception request with justification
2. Approval by security/SRE/architecture council
3. Implement compensating controls
4. Time-limited exceptions (90-day max)
5. Automated expiration monitoring

## Consequences

### Positive

1. **Reduced cognitive load** - Developers move between services with familiar patterns
2. **Faster onboarding** - New team members productive within days, not weeks
3. **Consistent security posture** - All services meet baseline security requirements
4. **Reliable observability** - Every service emits consistent metrics, logs, and traces
5. **Simplified governance** - Compliance audits check platform, not individual services
6. **Faster deployments** - Reusable workflows reduce pipeline configuration overhead
7. **Better incident response** - Standardized health checks and SLOs enable faster triage
8. **Reduced maintenance** - Platform team maintains templates; service teams consume

### Negative

1. **Initial migration effort** - Existing services require updates to align with standards
2. **Reduced flexibility** - Some edge cases may require exceptions or workarounds
3. **Platform team dependency** - Template updates require platform team involvement
4. **Learning curve** - Teams must learn new CLI and conventions
5. **Potential bottleneck** - Exception requests could slow down non-standard work

### Mitigations

| Risk | Mitigation |
|------|------------|
| Migration effort | Phased rollout starting with new services; migration guide for existing |
| Reduced flexibility | Clear exception process with 48-hour SLA |
| Platform dependency | Self-service template extensions; community contribution model |
| Learning curve | Comprehensive documentation; training sessions; office hours |
| Exception bottleneck | Pre-approved exception patterns for common cases |

## Alternatives Considered

### 1. Documentation-Only Approach

Provide guidelines without tooling enforcement.

**Rejected because**: Historical evidence shows documentation alone is insufficient; teams drift from standards over time without automated enforcement.

### 2. Full Service Mesh Enforcement

Require all services to use Istio with mandatory sidecars.

**Rejected because**: Adds operational complexity and latency overhead; not all services require mesh capabilities.

### 3. Monolithic Template Repository

Single template that all services fork from.

**Rejected because**: Fork-based approach makes template updates difficult to propagate; leads to drift over time.

### 4. No Platform Standardization

Allow teams complete autonomy in service implementation.

**Rejected because**: Current state demonstrates this leads to inconsistency, security gaps, and operational burden.

## Implementation Plan

### Phase 1: Foundation (Weeks 1-4)
- [ ] Finalize service archetypes and directory structures
- [ ] Implement scaffold CLI with API service template
- [ ] Create reusable CI/CD workflow templates
- [ ] Document exception process

### Phase 2: Templates (Weeks 5-8)
- [ ] Add worker, batch, data service templates
- [ ] Add frontend template
- [ ] Add shared library template
- [ ] Create policy templates (OPA, Kyverno)

### Phase 3: Migration (Weeks 9-16)
- [ ] Pilot with 3 new services
- [ ] Develop migration guide for existing services
- [ ] Migrate 10 high-priority services
- [ ] Gather feedback and iterate

### Phase 4: Scale (Weeks 17-24)
- [ ] Roll out to all teams
- [ ] Deprecate legacy patterns
- [ ] Establish platform team rotation
- [ ] Publish public documentation

## Success Metrics

| Metric | Baseline | Target | Timeline |
|--------|----------|--------|----------|
| New service time-to-production | 2 weeks | 2 days | 6 months |
| Cross-team PR review time | 2 days | 4 hours | 6 months |
| Security audit duration | 2 weeks/service | 2 days/service | 12 months |
| Incident MTTR | 45 min | 15 min | 12 months |
| SLO compliance | 85% | 99% | 12 months |

## Related Documents

- [Platform Blueprint](./PLATFORM_BLUEPRINT.md)
- [Scaffolding Templates](./SCAFFOLDING_TEMPLATES.md)
- [CI/CD Pipeline Design](./CICD_PIPELINE.md)
- [Service Onboarding Checklist](./ONBOARDING_CHECKLIST.md)

## Decision Makers

| Role | Name | Decision |
|------|------|----------|
| Architecture Lead | TBD | Pending |
| Security Lead | TBD | Pending |
| SRE Lead | TBD | Pending |
| Engineering Director | TBD | Pending |

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2025-12-06 | Golden Path Platform Team | Initial draft |
