# Migration Playbook: Backward-Compatible by Default

This playbook describes how to ship database schema changes safely. Pair it with
the `migration-linter` CI check, which blocks destructive changes unless they
are explicitly approved.

## Core Principles

- **Expand then contract.** Add nullable or defaulted columns, backfill, flip
  reads/writes, then remove legacy columns in a later migration.
- **Dual-write windows.** When renaming/splitting fields, write to both old and
  new columns/tables until all consumers read from the new shape.
- **Roll-forward friendly.** Avoid irreversible drops; prefer flags, views, or
  shadow tables that can be promoted after validation.

## Safe Patterns (Examples)

1. **Add nullable column**

   ```sql
   ALTER TABLE users ADD COLUMN nickname TEXT;
   ```

2. **Add NOT NULL with default and backfill**

   ```sql
   ALTER TABLE users ADD COLUMN email_normalized TEXT;
   UPDATE users SET email_normalized = lower(email) WHERE email_normalized IS NULL;
   ALTER TABLE users ALTER COLUMN email_normalized SET NOT NULL;
   ```

3. **Rename via dual-write**

   ```sql
   -- Phase 1: Add new column (nullable), dual-write in app code
   ALTER TABLE orders ADD COLUMN submitted_at TIMESTAMP;

   -- Phase 2: Backfill
   UPDATE orders SET submitted_at = created_at WHERE submitted_at IS NULL;

   -- Phase 3: Enforce and clean up (after code reads new column)
   ALTER TABLE orders ALTER COLUMN submitted_at SET NOT NULL;
   -- Only after all consumers use submitted_at:
   -- ALTER TABLE orders DROP COLUMN created_at;
   ```

## What the Linter Blocks

- `DROP TABLE` / `DROP COLUMN`
- `RENAME TABLE` / `RENAME COLUMN`
- `ALTER COLUMN ... SET NOT NULL` without a default/backfill
- `ADD COLUMN ... NOT NULL` without a default/backfill

These are allowed **only** with an explicit approval annotation.

## Approval for Destructive Changes

If a destructive change is required and risk-assessed, annotate the migration
with a ticket/issue ID:

```sql
-- APPROVED_DESTRUCTIVE_CHANGE: DB-1234
ALTER TABLE users DROP COLUMN legacy_id;
```

For TypeScript/JavaScript migrations, use `// APPROVED_DESTRUCTIVE_CHANGE: DB-1234`.

## Migration Templates

**Additive (expand) template**

```sql
-- Step 1: additive change (nullable or defaulted)
ALTER TABLE <table> ADD COLUMN <new_column> <type>;

-- Step 2: backfill
UPDATE <table> SET <new_column> = <expression> WHERE <new_column> IS NULL;

-- Step 3: enforce (later migration)
-- ALTER TABLE <table> ALTER COLUMN <new_column> SET NOT NULL;
```

**Contract (cleanup) template**

```sql
-- Requires prior dual-write + read cutover
-- APPROVED_DESTRUCTIVE_CHANGE: <ticket-id>
ALTER TABLE <table> DROP COLUMN <old_column>;
```

**Rename via dual-write**

```sql
-- Expand
ALTER TABLE <table> ADD COLUMN <new_column> <type>;
-- Application: dual-write to <old_column> and <new_column>

-- Backfill
UPDATE <table> SET <new_column> = <old_column> WHERE <new_column> IS NULL;

-- Enforce (later)
ALTER TABLE <table> ALTER COLUMN <new_column> SET NOT NULL;

-- Contract (later, with approval)
-- APPROVED_DESTRUCTIVE_CHANGE: <ticket-id>
-- ALTER TABLE <table> DROP COLUMN <old_column>;
```

## Usage

- Local: `pnpm run lint:migrations`
- CI: Runs automatically in `pr-quality-gate` workflow. Destructive changes will
  fail the build unless annotated.
