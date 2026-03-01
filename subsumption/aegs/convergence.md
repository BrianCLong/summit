# CONVERGENCE PROTOCOL: AEGS

## 1. Subsumption Validation Checks
- **Subsumption Schema Validation**: All artifacts MUST comply with the AEGS Subsumption Manifest (`manifest.yaml`).
- **Policy Enforcement**: Deny-by-default rules MUST pass, specifically targeting unintended external LLM calls during CI.
- **Evidence Formatting**: `evidence_id` fields MUST strictly match the regex `^EVID-[A-Z0-9]+-[A-F0-9]{8}$`.
- **Claim References**: Any deterministically produced evidence outputs MUST have an associated `claim_ref`.

## 2. CI Verification Configuration
The verifier script `scripts/ci/verify_subsumption_bundle.mjs` MUST be executed against the `aegs` item context.

```bash
# Verify AEGS Bundle
node scripts/ci/verify_subsumption_bundle.mjs subsumption/aegs/manifest.yaml
```

## 3. Rollout Lane Progression
1. **Lane 1: foundation** - `feat(aegs): add AEGS bundle manifest + evidence schemas`
2. **Lane 2: foundation** - `feat(aegs): implement Evaluation Framework rubric and core metrics`
3. **Lane 3: foundation** - `feat(aegs): add Governance Infrastructure approval gates and policy engine`
4. **Lane 4: foundation** - `feat(aegs): develop Safety & Compliance guardrails and anomaly detection`
5. **Lane 5: foundation** - `feat(aegs): implement Metrics & Observability dashboards`
