# Quarantined Test Configurations

This directory contains test configuration files that have been quarantined to improve CI determinism.

## vitest.config.ts.quarantined

**Quarantined**: 2026-01-04
**Reason**: Server officially uses Jest (`jest.config.ts`). This vitest config was not in use
but contained metadata about test migration status (extensive exclude list).

**Action**: If migrating server tests to Vitest in the future, this file contains the
exclusion list that was tracking incompatible tests. Review and merge as needed.

**Reference**: See docs/ops/TEST_RUNTIME.md for canonical test runner decisions.
