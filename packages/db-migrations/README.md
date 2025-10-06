# @summit/db-migrations

A robust, database-agnostic migration runner with first-class rollback support. The package provides:

- Automatic rollback of partially applied batches when a migration fails.
- Dependency-aware planning with version tracking and checksum validation.
- Transactional execution for PostgreSQL, MySQL, and MongoDB adapters.
- Dry-run, backup/restore hooks, and state persistence pluggable interfaces.

Consult [`docs/OPERATIONS.md`](./docs/OPERATIONS.md) for production run-books and operational guidance.
