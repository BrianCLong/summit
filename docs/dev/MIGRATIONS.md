# Migration Safety Rules

The migration linter defends against destructive SQL by scanning every `migrations` folder for risky patterns. It is designed to be fast and to fail the build with actionable guidance.

## Checks

- **DROP without IF EXISTS** — prevents destructive drops without a guard.
- **Unbounded ALTER** — flags `ALTER TABLE` statements that are not scoped with `IF EXISTS/IF NOT EXISTS` or concurrent/index-safe approaches.
- **Missing transaction wrapper on risky DDL** — if a migration contains a `DROP` or `ALTER` but no explicit `BEGIN/COMMIT`, the linter requests an explicit transaction to make the change atomic.

## Usage

```bash
bash scripts/lint-migrations.sh         # lint migration files changed in this branch (fast default)
LINT_MIGRATIONS_FULL=1 bash scripts/lint-migrations.sh  # lint every migration file
bash scripts/lint-migrations.sh services # lint a specific subtree
```

## Allowlist (use sparingly)

If a migration must intentionally violate a rule, add a rationale and the tag below anywhere in the file:

```sql
-- lint-migrations: allow-risky  -- justified: legacy rollback requires non-transactional DDL
```

Allowlisted files are reported as skipped but remain documented for reviewers.
