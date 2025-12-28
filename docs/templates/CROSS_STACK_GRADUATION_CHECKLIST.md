# Cross-Stack Graduation Checklist (Template)

> **Use for promotion requests only.** Attach this checklist to the evidence bundle or PR.

## Lifecycle Declaration (Single Source of Truth)

- Frontend lifecycle: Experimental | GA-Adjacent | GA
- Backend lifecycle: Experimental | GA-Adjacent | GA
- Promotion intent: None | Experimental → GA-Adjacent | GA-Adjacent → GA

## Frontend Gates

- [ ] Flagged, isolated UI (Experimental → GA-Adjacent)
- [ ] Claim & semantics audit
- [ ] Golden-path compatibility
- [ ] Demo-safety verification
- [ ] Updated golden-path contracts (GA-Adjacent → GA)
- [ ] Exposure mode parity
- [ ] No experimental affordances remaining

## Backend Gates

- [ ] Read-only or clearly bounded write paths (Experimental → GA-Adjacent)
- [ ] API stability guarantees
- [ ] Performance and error budgets defined
- [ ] Security & access controls reviewed
- [ ] API contracts locked (GA-Adjacent → GA)
- [ ] Backward compatibility guarantees
- [ ] Operational readiness confirmed

## Joint Gates

- [ ] Shared hypothesis & success criteria
- [ ] End-to-end journey validation
- [ ] No GA contract violations
- [ ] Unified promotion approval
- [ ] End-to-end SLO compliance (GA-Adjacent → GA)
- [ ] Compliance / governance sign-off
- [ ] Documentation parity (frontend + backend)
- [ ] Versioned release artifact

## Evidence Bundle

- [ ] Lifecycle declaration (frontend + backend)
- [ ] Frontend contracts & tests
- [ ] Backend API contracts & tests
- [ ] Performance/reliability metrics
- [ ] Security/compliance attestations
- [ ] Demo exposure verification
- [ ] Joint approval record

## Approval Record

- Frontend DRI:
- Backend DRI:
- Cross-Stack Graduation Systems Owner:
