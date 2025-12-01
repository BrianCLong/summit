# 4TH-ORDER ENTERPRISE SUPERLAYER

Every implementation, regardless of agent, MUST consider these overarching principles.

## GOVERNANCE

### Maintainability
- Code should be easier to change than it was before
- Reduce cognitive load for future developers
- Improve discoverability of functionality
- Clear separation of concerns
- Explicit over implicit

### Auditability
- All changes traceable to requirements
- Comprehensive logging at boundaries
- Structured events for analysis
- Clear data lineage
- Change history preserved

### Policy Compliance
- Legal requirements embedded
- Security policies enforced
- Data governance rules applied
- Privacy requirements met
- Regulatory compliance maintained

---

## OPERATIONS

### Reliability
- Reduce future operational load
- Lower Mean Time To Recovery (MTTR)
- Increase system resilience
- Graceful degradation
- Circuit breakers and bulkheads

### Observability
- Structured logging with context
- Distributed tracing
- Metrics at all boundaries
- Health checks and readiness probes
- SLI/SLO tracking

### Scalability
- Horizontal scaling support
- Resource efficiency
- Performance under load
- Cost optimization
- Capacity planning data

---

## SECURITY

### Defense in Depth
- Multiple security layers
- Zero trust architecture
- Principle of least privilege
- Secure by default
- Fail securely

### Data Protection
- Encryption at rest and in transit
- PII/PHI handling
- Data retention policies
- Secure data disposal
- Access control and audit

### Threat Mitigation
- Input validation
- Output encoding
- SQL injection prevention
- XSS prevention
- CSRF protection
- Rate limiting
- DDoS mitigation

---

## ARCHITECTURE

### Coupling Reduction
- Loose coupling between services
- Interface-based design
- Dependency injection
- Event-driven where appropriate
- Minimize shared state

### Coherence Improvement
- Consistent patterns
- Clear boundaries
- Unified error handling
- Standard logging format
- Shared vocabulary

### Drift Prevention
- Align with existing patterns
- Document deviations
- Refactor toward standards
- Remove obsolete code
- Keep dependencies current

### Module Clarity
- Single responsibility
- Clear interfaces
- Documented contracts
- Testable in isolation
- Understandable purpose

---

## ORGANIZATIONAL EFFECTIVENESS

### Developer Experience
- Clear documentation
- Helpful error messages
- Fast feedback loops
- Easy local development
- Comprehensive examples

### Knowledge Transfer
- Self-documenting code
- Architecture Decision Records
- Runbooks for operations
- Troubleshooting guides
- Learning resources

### Velocity Sustainability
- Technical debt management
- Continuous refactoring
- Test coverage maintenance
- CI/CD reliability
- Deployment confidence

---

## IMPLEMENTATION CHECKLIST

Before considering any task complete, verify:

### Governance
- [ ] Code is more maintainable than before
- [ ] Changes are fully auditable
- [ ] All policies complied with
- [ ] Documentation complete
- [ ] Knowledge captured

### Operations
- [ ] Reliability improved or maintained
- [ ] Full observability instrumented
- [ ] Scalability considered
- [ ] Resource usage optimized
- [ ] Runbooks updated

### Security
- [ ] Multiple security layers
- [ ] Data protection verified
- [ ] Threats mitigated
- [ ] Security review passed
- [ ] Penetration testing considered

### Architecture
- [ ] Coupling reduced
- [ ] Coherence improved
- [ ] No architectural drift
- [ ] Module boundaries clear
- [ ] Patterns followed

### Organization
- [ ] Developer experience improved
- [ ] Knowledge transfer artifacts created
- [ ] Velocity sustained or improved
- [ ] Team confidence increased
- [ ] Future changes easier

---

This layer governs ALL subordinate prompts and ALL agent outputs.

**Failure to consider 4th-order implications is delivery failure, regardless of technical correctness.**
