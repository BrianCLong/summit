# UnityShield Convergence Protocol

This protocol defines the guardrails and requirements for merging UnityShield subsumption PRs.

## 1. Lane Management
PRs must be categorized into one of two lanes:
- **Foundation Lane**: Infrastructure, adapters, OPA policies, and security controls.
- **Innovation Lane**: Analytics, agents, UI dashboards, and experimental features.

## 2. Gate Requirements
Every PR must pass the following gates:
- `subsumption-bundle-verify`: Validates manifest and evidence completeness.
- `governance-evidence`: Ensures all required evidence artifacts are present and valid.
- `pnpm-audit`: Zero high/critical vulnerabilities.
- `security-approved`: Mandatory review from a security DRI for any code touching auth or data handling.

## 3. Evidence Standards
Evidence must be provided for every functional requirement (FR) and non-functional requirement (NFR) claimed in the PR.
- **Format**: Machine-verifiable JSON reports in `evidence/`.
- **IDs**: Must match the pattern `EVD-UNITYSHIELD-<TYPE>-<ID>`.

## 4. Performance Thresholds
UnityShield PRs must not regress Summit's global performance benchmarks:
- p95 GraphQL response < 2s.
- Ingestion latency < 40ms.
- 0.5% error budget.

## 5. Convergence Flow
1. **Foundation First**: All infrastructure and security controls must be merged and verified on `main`.
2. **Innovation Parallel**: Analytics and agents can be developed in parallel branches.
3. **Integration Gate**: Innovation lane PRs are merged only after foundation is stable and load tests pass.
4. **Final Verification**: Comprehensive system verification before closing the subsumption bundle.
