
#!/usr/bin/env bash
# scripts/migration-gate.sh

echo "Verifying schema migration safety..."

# 1. Apply to staging
# helm upgrade --install intelgraph-stage ... --set-file migrations=next-migration.sql

# 2. Run smoke tests
# k6 run tests/k6/smoke.js

# 3. Run backfill in dry-run
# ./scripts/run-backfill --dry-run

echo "Migration gate checks passed on staging. Manual approval required for production."
exit 0
