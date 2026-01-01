# ADR-0008: Authority & License Compiler Design

**Date:** 2024-02-10
**Status:** Accepted
**Area:** Compliance
**Owner:** Compliance & Policy Guild
**Tags:** authority, licensing, compiler, policy, governance

## Context

Summit operates in highly regulated industries where data usage must comply with complex, hierarchical authority frameworks (government classifications, export controls, licenses, organizational policies). Each data element may have:

- **Multiple overlapping authorities**: ITAR, EAR, CUI, proprietary licenses, NDAs
- **Derived authorities**: Data derived from classified sources inherits restrictions
- **Policy composition**: Organizational policies layer on top of regulatory requirements
- **Provenance-based enforcement**: Use restrictions depend on data lineage

Traditional approaches (runtime checks, manual reviews) fail because:
- Authority rules are complex and context-dependent
- Performance overhead of runtime evaluation
- Inconsistent interpretation across teams
- Lack of verifiable compliance trail

## Decision

We will build an **Authority & License Compiler** that compiles authority rules into executable policies and enforcement artifacts.

### Core Decision
The compiler:
- Parses authority definitions from structured YAML/JSON
- Compiles them into OPA Rego policies for runtime enforcement
- Generates TypeScript type guards for compile-time checks
- Produces attestation artifacts for audit compliance
- Validates policy consistency and detects conflicts

### Key Components
- **Authority DSL**: YAML-based domain-specific language for authority definitions
- **Compiler Pipeline**: Parse → Validate → Optimize → Codegen → Attest
- **OPA Policy Generator**: Emits Rego rules for runtime authorization
- **TypeScript Codegen**: Generates type guards and enums
- **Conflict Detector**: Identifies contradictory authority rules
- **Attestation Builder**: Creates signed compliance artifacts

## Alternatives Considered

### Alternative 1: Runtime Rule Engine
- **Pros:** Dynamic rule updates, flexible evaluation
- **Cons:** Performance overhead, no compile-time validation, harder to test
- **Cost/Complexity:** Lower upfront cost, higher runtime complexity

### Alternative 2: Hardcoded Authority Checks
- **Pros:** Fast, simple, explicit
- **Cons:** Brittle, inconsistent, unmaintainable, no audit trail
- **Cost/Complexity:** Quick initial development, unmaintainable long-term

### Alternative 3: External Policy Service
- **Pros:** Centralized, can be shared across services
- **Cons:** Network dependency, latency, single point of failure
- **Cost/Complexity:** Operational complexity, availability risk

## Consequences

### Positive
- Compile-time validation catches authority conflicts before deployment
- Generated OPA policies ensure consistent enforcement
- TypeScript types provide IDE autocomplete for valid authority codes
- Attestation artifacts provide verifiable compliance evidence
- Single source of truth for all authority definitions

### Negative
- Build-time dependency (changes require recompilation)
- Learning curve for Authority DSL
- Testing requires understanding of generated code
- Breaking changes in authority definitions can impact many services

### Operational Impact
- **Monitoring**: Track policy evaluation latency, cache hit rates, conflict detection
- **Security**: Sign compiled artifacts, validate signatures at runtime
- **Compliance**: Store attestations in provenance ledger, enable audit queries

## Code References

### Core Implementation
- `packages/authority-compiler/src/compiler.ts` - Main compiler pipeline
- `packages/authority-compiler/src/parser.ts` - Authority DSL parser
- `packages/authority-compiler/src/codegen/opa.ts` - OPA Rego generator
- `packages/authority-compiler/src/codegen/typescript.ts` - TypeScript codegen

### Authority Definitions
- `authority-definitions/*.yaml` - Authority definition source files
- `generated/authority-policies/*.rego` - Compiled OPA policies
- `generated/authority-types.ts` - Generated TypeScript types

### Runtime Integration
- `services/authz-gateway/src/authority.ts` - Runtime authority enforcement
- `policy/abac/authority.rego` - OPA policy integration

## Tests & Validation

### Unit Tests
- `packages/authority-compiler/tests/compiler.test.ts` - Compiler correctness
- `packages/authority-compiler/tests/conflict-detection.test.ts` - Conflict detection
- Expected coverage: 95%+

### Integration Tests
- `tests/integration/authority/end-to-end.test.ts` - Full compilation pipeline
- `tests/integration/authority/opa-eval.test.ts` - OPA policy execution

### CI Enforcement
- `.github/workflows/authority-compiler.yml` - Compile and validate on PR
- Pre-commit hook prevents invalid authority definitions

## References

### Related ADRs
- ADR-0002: ABAC Step-Up Auth (uses compiled authority policies)
- ADR-0011: Provenance Ledger Schema (tracks authority lineage)
- ADR-0005: Disclosure Packager (bundles authority attestations)

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2024-02-10 | Compliance Guild | Initial version |
