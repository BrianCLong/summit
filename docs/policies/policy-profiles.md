# Policy Profiles & OPA Bundle Mapping

This document defines the policy profile manifests and their corresponding OPA bundle mappings.
The authoritative manifests live in `server/src/policies/profile-manifests.ts` and are referenced
by the assignment service and policy simulation entry points.

## Profile Manifests

| Profile ID | Name                 | Version | Manifest Checksum                                                         | Bundle ID                | Bundle Version | Bundle Checksum                                                           | Rego Package      | Entrypoints |
| ---------- | -------------------- | ------- | ------------------------------------------------------------------------- | ------------------------ | -------------- | ------------------------------------------------------------------------- | ----------------- | ----------- |
| `baseline` | Baseline Security    | `1.0.0` | `sha256:efa3e71a1c53e0fdcddb7770e69ac4e8365d87b61b2ec69bc22b41addbcf8141` | `bundle-tenant-baseline` | `1.0.0`        | `sha256:efa3e71a1c53e0fdcddb7770e69ac4e8365d87b61b2ec69bc22b41addbcf8141` | `tenant.baseline` | `allow`     |
| `strict`   | Strict Compliance    | `1.0.0` | `sha256:eea08b394e7e6d9c166d71dd6dfc7f272f892a322f5696525594d39f40f86c8e` | `bundle-tenant-strict`   | `1.0.0`        | `sha256:eea08b394e7e6d9c166d71dd6dfc7f272f892a322f5696525594d39f40f86c8e` | `tenant.strict`   | `allow`     |
| `custom`   | Custom Configuration | `0.1.0` | `sha256:e577399240ac113522e869c4fb0ad64836501cab3f89514b653dd326c5761ba5` | `bundle-tenant-custom`   | `0.1.0`        | `sha256:e577399240ac113522e869c4fb0ad64836501cab3f89514b653dd326c5761ba5` | `tenant.custom`   | `allow`     |

> **Note:** The concrete checksums are computed in the profile manifest module to ensure the
> profile and bundle pointers stay aligned in runtime state and provenance.

## Expected OPA Bundle Diffs

### Baseline ➜ Strict

- **Guardrails:** `requirePurpose=true`, `requireJustification=true` (baseline is `false` for both).
- **Rules:** baseline allows read across environments; strict narrows to internal reads only.
- **Cross-tenant:** remains `deny` with agreements required.

### Baseline ➜ Custom

- **Guardrails:** retain default-deny but allow tenant overrides.
- **Cross-tenant:** shifts to `allowlist`.
- **Rules:** custom bundle is intentionally minimal and expects tenant overlays to add allow rules.

### Strict ➜ Custom

- **Guardrails:** remove strict purpose/justification requirements unless overlays reintroduce them.
- **Cross-tenant:** switch from `deny` to `allowlist`.
- **Rules:** strict allowlist rules are removed; custom relies on overlays to define behavior.

## Operations

- **Assignment:** Use `POST /api/policy-profiles/assign` to move a tenant to a new profile.
- **Simulation:** `POST /api/policy/simulate` will re-read the tenant’s active profile by default.
