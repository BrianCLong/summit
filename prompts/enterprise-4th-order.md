# 4th-Order Enterprise Superlayer

Every implementation, regardless of agent, MUST adhere to these enterprise-level constraints.

This layer governs ALL subordinate prompts.

---

## Governance

All code changes must:

- Strengthen long-term maintainability
- Improve auditability and provenance
- Embed policy compliance (legal, security, data governance)
- Support future regulatory requirements
- Enable organizational knowledge transfer

### Compliance Checkpoints

- [ ] Data classification labels applied
- [ ] Audit logging implemented
- [ ] Policy hooks present
- [ ] Provenance chain maintained
- [ ] Retention policies respected

---

## Operations

All changes must:

- Reduce future operational load
- Lower MTTR (Mean Time To Recovery)
- Increase system reliability
- Improve incident response capability
- Support capacity planning

### Operational Excellence Criteria

- [ ] Health checks implemented
- [ ] Graceful degradation supported
- [ ] Runbooks updated
- [ ] Alerts configured
- [ ] SLIs/SLOs defined

---

## Security

All implementations must:

- Leverage systemic, not superficial, security
- Harden interfaces and boundaries
- Treat logs, events, and metrics as security artifacts
- Implement defense in depth
- Follow principle of least privilege

### Security Validation

- [ ] Input validation at boundaries
- [ ] Output encoding applied
- [ ] Authentication verified
- [ ] Authorization enforced
- [ ] Secrets management compliant
- [ ] No sensitive data in logs

---

## Architecture

All changes must:

- Reduce coupling between modules
- Increase cohesion within modules
- Remove architectural drift
- Improve module clarity
- Support evolutionary architecture

### Architecture Quality Gates

- [ ] Interface contracts stable
- [ ] Dependency direction correct
- [ ] Abstraction levels appropriate
- [ ] Bounded contexts respected
- [ ] API versioning maintained

---

## Organizational Effectiveness

All implementations must:

- Reduce cognitive load for new developers
- Improve discovery of modules and responsibilities
- Ensure feature velocity improves over time
- Support team autonomy
- Enable parallel development

### Developer Experience Metrics

- [ ] Documentation current
- [ ] Examples provided
- [ ] Error messages helpful
- [ ] Debug paths clear
- [ ] Onboarding friction reduced

---

## Quality Dimensions

### Code Quality

```
Maintainability = Readability + Testability + Modifiability
```

- Clean code principles applied
- Single responsibility adhered to
- DRY without over-abstraction
- YAGNI enforced

### Test Quality

```
Confidence = Coverage × Relevance × Determinism
```

- Unit tests for logic
- Integration tests for boundaries
- E2E tests for critical paths
- No flaky tests

### Documentation Quality

```
Usefulness = Accuracy × Discoverability × Timeliness
```

- README current
- API docs generated
- Architecture decisions recorded (ADRs)
- Runbooks maintained

---

## Enterprise Integration Points

### Provenance & SBOM

All builds must:

- Generate Software Bill of Materials
- Sign artifacts
- Maintain build provenance
- Support SLSA Level 3

### Observability Stack

All services must:

- Export metrics (Prometheus format)
- Emit structured logs (JSON)
- Propagate trace context (OpenTelemetry)
- Expose health endpoints

### Policy Engine

All access decisions must:

- Pass through OPA evaluation
- Log authorization decisions
- Support policy versioning
- Enable policy simulation

---

## Enforcement

This 4th-order layer is enforced through:

1. **Automated checks** - CI/CD gates
2. **Code review** - Human validation
3. **Architecture review** - Design validation
4. **Security review** - Threat modeling
5. **Operations review** - Runbook validation

No code ships without satisfying all four orders of requirements.

---

## Hierarchy

```
┌─────────────────────────────────────────────┐
│  4th Order: Enterprise Governance           │
│  ┌───────────────────────────────────────┐  │
│  │  3rd Order: Architecture/Ecosystem    │  │
│  │  ┌─────────────────────────────────┐  │  │
│  │  │  2nd Order: Implied Requirements│  │  │
│  │  │  ┌───────────────────────────┐  │  │  │
│  │  │  │  1st Order: Explicit Reqs │  │  │  │
│  │  │  └───────────────────────────┘  │  │  │
│  │  └─────────────────────────────────┘  │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

Each inner layer must satisfy all outer layers.

---

This superlayer applies to ALL agent outputs, regardless of which specialized agent generated the code.
