# Residency Evidence Index

| ID      | Description        | Policy Section | Enforcement        | Status      |
| ------- | ------------------ | -------------- | ------------------ | ----------- |
| RES-001 | Storage Locality   | 4.1            | DB Connection Pool | ✅ Enforced |
| RES-002 | Compute Locality   | 4.2            | Middleware Guard   | ✅ Enforced |
| RES-003 | Exception Audit    | 4.3            | Exception Workflow | ✅ Enforced |
| RES-004 | Cross-Region Block | 2.1            | ResidencyGuard     | ✅ Verified |

## Verification Artifacts

- `server/src/data-residency/residency-guard.ts`: Core enforcement logic.
- `server/src/middleware/residency.ts`: API enforcement.
- `docs/DATA_RESIDENCY_MODEL.md`: Authoritative Policy.
