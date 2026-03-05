# Convergence Protocol: MTWGL

This document specifies how the 5 sub-agent prompts come together to form the complete Multi-Tenant Workspace & Governance Layer.

1. **Foundation (P1)** establishes the core DB tables and data structures (`Organization`, `Tenant`, `Workspace`, `Project`).
2. **Isolation (P2)** builds on the Foundation to apply RLS and networking boundaries around those entities.
3. **Policy (P3)** utilizes the Isolation boundaries to enforce rules and manage secrets at the Workspace/Tenant levels.
4. **Billing (P4)** attaches usage meters to the entities defined in P1, operating within the boundaries of P2 and P3.
5. **Enterprise (P5)** layers SSO, auditing, and the Marketplace on top of the entire stack.

**Validation Checklist before CI Integration:**
- [ ] 3 synthetic tenants run without cross-leakage.
- [ ] Billing reports accurate to 1%.
- [ ] Full audit trail for policy/role changes.
- [ ] All subsystems (ACP, AEGS, TMAML, ASF) are tenant-aware.
