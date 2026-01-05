# Partner Quick-Start: Demo Tenant Bootstrap

## Authority & Alignment

This quick-start follows the Summit governance sources of truth and readiness posture:

- Summit Readiness Assertion: `docs/SUMMIT_READINESS_ASSERTION.md`
- Constitution & Meta-Governance: `docs/governance/CONSTITUTION.md`, `docs/governance/META_GOVERNANCE.md`
- Policy-as-code expectations: `docs/governance/RULEBOOK.md`

## Prerequisites

- Install dependencies: `pnpm install`
- Bring the stack up: `make bootstrap && make up`
- Validate the golden path: `make smoke`

## Demo Tenant Bootstrap (Admin)

1. Sign in with an admin-capable account (`ADMIN`, `PLATFORM_ADMIN`, or `SUPER_ADMIN`).
2. Open **Admin → Demo Tenant Bootstrap** in the web UI.
3. Click **Create Demo Tenant**. The system will:
   - Create the demo tenant template.
   - Seed investigation workflows.
   - Log evidence events to make evidence export ready.
4. Review **Evidence Export Status** in the same panel.

## API Quick-Start (Admin)

### 1) Create the demo tenant

```bash
curl -X POST http://localhost:4000/api/tenants/demo \
  -H "Authorization: Bearer <token>"
```

Response payload includes `tenantId`, `slug`, seeded workflows, and evidence seed window.

### 2) Verify evidence export readiness

```bash
curl "http://localhost:4000/api/evidence/exports/status?tenantId=<tenantId>" \
  -H "Authorization: Bearer <token>"
```

### 3) Generate an evidence bundle

```bash
curl -X POST http://localhost:4000/api/evidence/exports \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "<tenantId>",
    "timeRange": {
      "start": "2026-01-01T00:00:00Z",
      "end": "2026-01-02T00:00:00Z"
    }
  }' \
  --output evidence-bundle.zip
```

## Files & References

- Demo tenant template + workflow seeds: `server/src/services/tenants/seed/`
- Demo tenant bootstrap service: `server/src/services/tenants/DemoTenantBootstrapService.ts`
- Demo tenant admin route: `server/src/routes/tenants.ts`
- Evidence export readiness status: `server/src/routes/evidence.ts`
- Evidence export provenance queries: `server/src/repos/ProvenanceRepo.ts`
- Admin UI trigger and status panel: `apps/web/src/pages/AdminPage.tsx`

## Next Actions

- Align tenant policy bundles with your deployment’s policy authority files.
- Keep evidence export validation in your partner onboarding checklist.
- Treat exceptions as governed exceptions and document them in policy-as-code.
