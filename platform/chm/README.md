# Controlled Handling Module (CHM)

A focused service that enforces classification taxonomy, dual-control downgrades, and export controls with auditability.

## Features
- Node.js + TypeScript service backed by PostgreSQL.
- Taxonomy seeding and banner/stamp metadata.
- Rule engine for view/handle/export with residency + license enforcement.
- Dual-approval downgrade workflow with receipts.
- Event emission: `chm.tag.applied`, `chm.tag.downgraded`, `chm.tag.violated`.
- UI ribbons/stamps plus jQuery derived-from toggles for quick demos.
- Policy and Playwright tests for export blocking and downgrade approval.

## Getting started
1. Install dependencies: `pnpm install --filter chm`.
2. Run migrations + taxonomy seed: `pnpm --filter chm build && pnpm --filter chm db:migrate`.
3. Start dev server: `pnpm --filter chm dev` (defaults to port 4070).
4. Open `http://localhost:4070` to view ribbons and document stamps.

## API
- `POST /taxonomy/seed` — populate taxonomy.
- `POST /documents` — create/update document classification.
- `POST /export/:id` — evaluate export eligibility (residency + license enforced).
- `GET /rules/:id` — view, handle, and export rule decisions for a document.
- `POST /downgrade/requests` — create downgrade request (requires justification).
- `POST /downgrade/approve` — dual-control approvals; second distinct approver updates classification.
- `GET /audit/:documentId` — fetch audit receipts.

## Testing
- Unit/policy: `pnpm --filter chm test`.
- Playwright e2e: `pnpm --filter chm test:e2e`.
