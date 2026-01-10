# ABAC v1 Bundle

This bundle encodes a minimal attribute-based access control (ABAC) policy for Summit services. It enforces:

- Residency alignment between subject region/residency and resource residency.
- Clearance >= resource classification using the `classification.levels` table.
- Ownership binding when a resource owner is provided (subject.org must match).
- Role-aware action permissions from `actions` map.
- Step-up authentication for `export` actions when `subject.auth_strength` is below `step_up.min_auth_strength`, emitting an obligation to trigger step-up.

## Versioning

- **policy_version:** `abac.v1.0.0` recorded in `manifest.json` and exported by the policy bundle route.
- **Bundle contents:** `manifest.json`, `data.json`, and `policy.rego`. Update `manifest.revision` and the semantic version when policy logic or data changes.
- **Tests:** Jest tests under `tests/abac-policy.test.ts` validate residency, step-up, and deny-by-default behaviors using the bundle configuration. Update/extend tests with each policy change.

## Inputs

The policy expects inputs with the following attributes:

- `subject`: `role`, `roles[]`, `org`, `clearance`, `region`, `residency`, `auth_strength`
- `resource`: `classification`, `residency`, `owner`, `customer_id`
- `action`: `read | write | export | admin`
- `context`: any additional metadata; not directly used by the policy.

## Outputs

OPA returns `allow`, `reason`, and optional `obligations`. When step-up is required, an obligation with `type=step_up` is returned with the required assurance level.
