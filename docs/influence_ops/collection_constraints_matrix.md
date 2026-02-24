# Influence Ops Collection Constraints Matrix

## Decision Rule

Collection is allowed only when legal basis, platform terms, and tenant policy all pass. If any
control fails, collection is blocked.

## Matrix

| Surface Type | Default Posture | Allowed Methods | Required Controls | Block Conditions |
| --- | --- | --- | --- | --- |
| API-backed public content | Allow with controls | Official API | Tenant purpose binding, provenance stamp, retention class | Terms mismatch, missing purpose |
| API-less web content | Deny by default | Governed exception only | Legal approval record, robots/ToS check, residency route, rate constraints | Missing exception, jurisdiction deny |
| Ephemeral content | Deny by default | Governed exception only | Explicit case authorization, replay-safe capture policy, retention cap | Missing case authorization |
| Private or access-controlled channels | Deny | None in standard mode | N/A | Any attempt |
| User-uploaded evidence | Allow with controls | Signed upload path | Malware scan, provenance chain, tenant isolation | Unverified origin, failed scan |

## Governed Exceptions

A governed exception must include:

1. Approval owner and date
2. Jurisdiction scope
3. Platform-specific terms assessment
4. Expiry date
5. Rollback condition

If expiry is reached, collection auto-disables until renewed.
