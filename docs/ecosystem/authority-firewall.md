# Authority Firewall

**Ecosystem Governance Mechanism #1**

A hard boundary enforced in code that prevents external actors from usurping Summit's decision-making power.

## Core Rules

1.  **No External Write Access to Decision State**: Plugins/Partners cannot directly modify the state of a decision. They can only submit proposals or evidence.
2.  **No External Modification of Evidence**: Once evidence is committed, it is immutable. Partners cannot edit or delete it.
3.  **No Plugin-Level Overrides**: A partner cannot disable a policy, bypass a check, or force an action.

## Implementation Concept

The firewall acts as a proxy between the ecosystem and the core decision engine.

```typescript
// Conceptual Interface
interface AuthorityFirewall {
  // Safe: Submitting information
  submitEvidence(source: PartnerId, evidence: Evidence): void;
  submitProposal(source: PartnerId, proposal: Recommendation): void;

  // Forbidden: Direct State Manipulation
  // setDecision(decision: Decision): ERROR;
  // overridePolicy(policyId: string): ERROR;
}
```

All interactions from the ecosystem layers must pass through this firewall.
