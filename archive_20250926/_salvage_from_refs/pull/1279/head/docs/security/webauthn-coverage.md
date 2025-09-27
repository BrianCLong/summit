# WebAuthn Step-Up Coverage Map

Sensitive Operations
- Graph mutations
- Trust-policy edits
- ER auto-merge override
- Admin role grants

Enforcement
- Gateway middleware enforces step-up; 401 with `StepUpRequired` on missing assertion.

Policy (Rego)
```
package gateway.auth.stepup

sensitive_ops := {"MUTATE_GRAPH", "TRUST_POLICY_EDIT", "ER_OVERRIDE", "ROLE_GRANT"}
require_step_up[op] { op := input.operation; op in sensitive_ops }
```

Goal
- ≥ 99% step-up coverage for sensitive endpoints.

