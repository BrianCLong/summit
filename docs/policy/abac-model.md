# Summit ABAC Model (OPA bundle)

## Attribute schema

### Subject attributes

- `role`: primary job role for coarse-grained checks (string)
- `roles`: additional roles/groups (string[])
- `org`: organization/owner binding (string)
- `tenantId`: tenancy scoping (string)
- `clearance`: classification clearance (`public|internal|confidential|secret|top-secret`)
- `region`: geographic region code (e.g., `us`, `eu`, `apac`)
- `residency`: residency anchor for data handling (string)
- `auth_strength`: authentication strength / assurance level (`loa1`, `loa2`, ...)

### Resource attributes

- `classification`: data sensitivity classification
- `residency`: residency anchor for the resource
- `owner`: owning org/tenant
- `customer_id`: customer context for multi-tenant SaaS

### Actions

`read | write | export | admin`

## Policy rules (v1)

1. **Least privilege default** – `allow=false` unless a rule matches.
2. **Residency enforcement** – subject region/residency must match resource residency unless resource is tagged `global/any`.
3. **Clearance ladder** – subject clearance must be >= resource classification using `classification.levels`.
4. **Ownership guard** – when `resource.owner` is present, subject org must match.
5. **Role gating** – allowed roles per action from `policy/abac/v1/data.json`.
6. **Export requires step-up** – `export` actions require `auth_strength >= loa2`; otherwise an obligation (`type=step_up`, `requirement=loa2`) is emitted and the decision is deny.

## Bundle layout

```
policy/abac/v1/
├─ manifest.json      # policy_version, revision, roots
├─ data.json          # classification ladder, residency modes, action roles, step-up rule
└─ policy.rego        # OPA rules
```

## Decision record format

Every enforcement event should emit:

- `decision_id` – UUID for traceability
- `policy_version` – from `manifest.policy_version`
- `inputs_hash` – SHA-256 of canonicalized input
- `allow`, `reason`, `obligations`
- `timestamp`, `tenantId`, `subject`, `resource`, `action`

## Examples

### 1. Residency allowed

```
subject: { org: "intelgraph", clearance: "confidential", region: "eu", auth_strength: "loa2", roles: ["analyst"] }
resource: { residency: "eu", classification: "internal", owner: "intelgraph" }
action: "read"
=> allow=true, reason="allow"
```

### 2. Step-up required for export

```
subject: { org: "intelgraph", clearance: "top-secret", region: "us", auth_strength: "loa1", roles: ["analyst"] }
resource: { residency: "us", classification: "secret", owner: "intelgraph" }
action: "export"
=> allow=false, reason="step_up_required", obligations=[{type:"step_up", requirement:"loa2"}]
```

### 3. Residency denied

```
subject: { org: "intelgraph", clearance: "secret", region: "us", auth_strength: "loa2", roles: ["analyst"] }
resource: { residency: "eu", classification: "internal", owner: "intelgraph" }
action: "read"
=> allow=false, reason="residency_mismatch"
```

## Updating the policy

1. Edit `policy/abac/v1/policy.rego` or `data.json`.
2. Increment `manifest.policy_version` and `manifest.revision`.
3. Update tests in `services/authz-gateway/tests/abac-policy.test.ts`.
4. Export via `/policy/bundle` route; consumers pick up the new bundle without application code changes.
