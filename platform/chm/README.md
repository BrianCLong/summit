# CHM (Content Handling & Markings)

A Node.js/TypeScript + PostgreSQL package that delivers policy-driven content handling for classification taxonomies, dual-control downgrade workflows, export enforcement, and auditability. UI ribbons, document stamps, and export disclaimers keep human operators aligned with machine-enforced rules, while events feed downstream observability.

## Architecture

- **Domain**: `src/config.ts`, `src/taxonomy.ts` define classification taxonomy (TS/S/C/U) with allowed downgrade paths.
- **Rule engine**: `src/rules.ts` evaluates residency/license export rules and emits violations (`chm.tag.violated`).
- **Workflow**: `src/workflow.ts` orchestrates export evaluation plus dual-approval downgrade gating (`request -> approve -> finalize`).
- **Events**: `src/events.ts` exposes `chm.tag.applied`, `chm.tag.downgraded`, `chm.tag.violated` for downstream sinks.
- **Audit**: `src/audit.ts` persists receipts for tagging/downgrade/export decisions into Postgres.
- **UI**: `public/index.html` provides banners/ribbons, document stamps, export disclaimers, and jQuery toggles for derived-from markings.
- **Schema**: `migrations/001_init.sql` creates taxonomy, rule, tag, downgrade, export, and audit tables in the `chm` schema.

### Data model

- **Taxonomy**: codes with descriptions, classification level, and allowed downgrade targets.
- **Rules**: residency + license + exportable flag tied to a taxonomy code.
- **Downgrade requests**: track requester, rationale, target level, and required approvals; approvals stored separately for dual control.
- **Exports**: capture actor, residency, license, destination, decision, and rationale.
- **Audit receipts**: append-only JSON payloads for any action.

### Runtime wiring

`src/index.ts` wires the default taxonomy, sample rules, event listeners, and audit logging. It demonstrates applying a tag, evaluating export eligibility, and persisting receipts. Replace the sample rules with environment-specific ones and load the Postgres connection string through `CHM_DATABASE_URL`.

## Usage

1. **Install** (from `platform/chm`):
   ```sh
   npm install
   ```
2. **Migrate**:
   ```sh
   psql "$CHM_DATABASE_URL" -f migrations/001_init.sql
   ```
3. **Run**:
   ```sh
   npm run dev
   ```
4. **Open UI**: serve `public/index.html` (any static server) to view ribbons, stamps, and derived-from toggle.

## Tests

- **Policy conformance**: `tests/unit/rules.spec.ts` covers residency/license enforcement and dual-control downgrade completion.
- **E2E**: `tests/e2e/chm.spec.ts` Playwright flow: apply tag → blocked export → approve downgrade → export allowed → receipts recorded.
- Run unit tests: `npm test`
- Run Playwright: `npm run test:e2e`

## Events & audit

- `chm.tag.applied`: emitted when taxonomy tag applied.
- `chm.tag.downgraded`: emitted after dual-control downgrade.
- `chm.tag.violated`: emitted when an export rule blocks execution.

Use `AuditReceiptService.recordExport` and `recordTag` to generate receipts that align with the schema created by the migration.

## Export safeguards

- Residency check aligns actor/destination zone with policy rule.
- License tier gate (`exportable`, `domestic-only`, `blocked`).
- Dual-control downgrade enforced before re-running export evaluation at the lower classification.
- UI includes export disclaimers and derived-from stamps to keep operators aware of obligations.
