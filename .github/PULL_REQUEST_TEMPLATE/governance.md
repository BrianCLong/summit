---
name: Governance Change
about: Changes to policies, governance framework, or compliance controls
title: "[GOVERNANCE] "
labels: "area/governance, risk/high"
assignees: ""
---

## Summary

<!-- What governance rule, policy, or control is being changed? -->

## Type of Governance Change

- [ ] Policy update (OPA `.rego` files)
- [ ] Governance framework change (`docs/governance/`)
- [ ] Compliance control modification (`evidence/`, `policies/`)
- [ ] Autonomy tier change (agent contract)
- [ ] Security baseline update (`docs/ga/SECURITY_BASELINE.md`)
- [ ] Locked document update (requires security-council approval)

## Rationale

<!-- Why is this governance change necessary? -->

## Impact Assessment

<!-- Who/what is affected by this change? -->

- **Scope**: <!-- teams, services, users affected -->
- **Risk**: <!-- low/medium/high -->
- **Enforcement**: <!-- how will this be enforced? CI, runtime, manual? -->

## Changes

<!-- Detailed description of governance changes -->

-
-
-

## Evidence & Validation

<!-- Required for all governance changes -->

- [ ] Policy tests updated (`policies/tests/`)
- [ ] OPA check passes (`opa check policies/`)
- [ ] OPA test passes (`opa test policies/ -v`)
- [ ] Governance engine validates changes
- [ ] Documentation updated (if framework change)

**Validation Commands**:

```bash
opa check policies/
opa test policies/ -v
npm run check:governance
```

## Backward Compatibility

- [ ] **Breaking change**: Existing policies/behaviors will change
- [ ] **Non-breaking**: Additive or clarification only

<!-- If breaking, describe migration path -->

**Migration Path** (if breaking):

## Compliance Implications

- [ ] Affects audit trail retention
- [ ] Affects compliance controls (SOC 2, ISO, etc.)
- [ ] Requires external audit notification
- [ ] Affects regulatory obligations

## Security Council Approval

<!-- Required for locked document changes -->

- [ ] Security Lead approval: @security-lead
- [ ] SRE Lead approval: @sre-lead
- [ ] Release Captain approval: @release-captain

## Rollback Plan

<!-- How to rollback this governance change? -->

- Revert policy:
- Impact of rollback:
- Emergency override:

## Related Documents

<!-- Link to ADRs, governance docs, compliance requirements -->

- ADR:
- Compliance requirement:
- Related policies:

---

**Pre-Merge Checklist** (for reviewers):

- [ ] Governance impact fully understood
- [ ] Policy tests comprehensive
- [ ] OPA validation passed
- [ ] Security implications reviewed
- [ ] Compliance officer notified (if applicable)
- [ ] Rollback plan validated
- [ ] Required approvals obtained (2+ from security council)
