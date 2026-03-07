# GDELT Narrative Slice Assets

This directory contains deterministic SQL templates used by the Summit GDELT narrative signal
pipeline.

## Files

- `sql/001_create_internal_tables.sql`: creates internal BigQuery tables for slices, batches, and alerts.
- `sql/010_slice_cyber_finance_60m.sql`: extracts the first deployable cyber+finance rolling slice.
- `sql/020_build_narrative_batches.sql`: compacts extracted rows into batch contracts for enrichment.

## Execution order

1. run `001_create_internal_tables.sql` once per environment;
2. schedule `010_slice_cyber_finance_60m.sql` every 15 minutes;
3. schedule `020_build_narrative_batches.sql` after extraction completion.
