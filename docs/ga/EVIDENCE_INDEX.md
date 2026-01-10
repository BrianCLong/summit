# MVP-4 GA Evidence Index

This index references the automated evidence bundles generated for the MVP-4 General Availability release.

## Active Evidence Bundles

| Bundle ID | Date Generated | Scope | Controls Covered | Location |
|-----------|----------------|-------|------------------|----------|
| `auditor-bundle-2026-01-10T02-37-07-926Z` | 2026-01-10 | Full GA Suite | CC1.1, CC1.2, CC6.1, CC7.1, CC8.1 | `evidence/auditor-bundle-2026-01-10T02-37-07-926Z/` |

## Control Coverage

### CC1.1: Defined Governance
- **Status**: Covered
- **Artifacts**: `AGENTS.md`, `docs/governance/README.md`
- **Evidence**: Snapshot present in bundle.

### CC1.2: Code Change Authorization
- **Status**: Covered
- **Artifacts**: `.github/workflows/ci.yml`, `docs/governance/ci-enforcement.md`
- **Evidence**: Snapshot present in bundle.

### CC6.1: Logical Access Controls
- **Status**: Covered
- **Artifacts**: `policies/`, `server/src/middleware/auth.ts`
- **Evidence**: Snapshot present in bundle.

### CC7.1: Change Management
- **Status**: Covered
- **Artifacts**: `docs/governance/RULEBOOK.md`, `.github/workflows/ci.yml`
- **Evidence**: Snapshot present in bundle.

### CC8.1: Tested Changes
- **Status**: Covered
- **Artifacts**: `.github/workflows/ci.yml`
- **Evidence**: Snapshot present in bundle.

## Verification

To regenerate this evidence bundle, run:

```bash
npx tsx scripts/compliance/generate_evidence.ts
```

To verifying checksums:

```bash
cd evidence/auditor-bundle-2026-01-10T02-37-07-926Z
sha256sum -c SHA256SUMS
```
