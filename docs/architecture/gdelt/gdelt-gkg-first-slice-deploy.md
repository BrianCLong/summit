# First Slice Deployment Guide: GDELT GKG Narrative Sensor

## Purpose

This guide operationalizes the first production slice (`cyber + finance`, 60-minute rolling window)
using deterministic SQL templates and governed output contracts.

## Preconditions

- BigQuery dataset exists for Summit internal tables.
- Scheduled query service account has least-privilege write to internal dataset only.
- Graph/vector/doc stores are provisioned and reachable by enrichment worker.

## Step 1: Create internal tables

Run `narratives/gdelt/sql/001_create_internal_tables.sql` in BigQuery.

## Step 2: Run rolling slice extraction

Run `narratives/gdelt/sql/010_slice_cyber_finance_60m.sql` as a scheduled query every 15 minutes.

## Step 3: Build compact batch rows

Run `narratives/gdelt/sql/020_build_narrative_batches.sql` after extraction job completion.

## Step 4: Enrichment worker contract

Worker input:

- table: `summit.narrative_batches`
- key: `batch_id`

Worker outputs:

- document index records
- graph upserts
- vector upserts
- alert records

## Step 5: Alert gate defaults

- volume z-score threshold: `>= 2.0`
- anxiety/fear z-score threshold: `>= 2.0`
- network centrality delta threshold: `>= 1.5`

## Step 6: Runtime validation checks

- batch row count for latest window > 0
- no null `batch_id` or `slice_id`
- alert rows reference known `batch_id`
- graph query budget checks pass for bounded ego-network reads

## Rollback

1. Disable scheduled queries.
2. Re-point agent retrieval to last-good slice table snapshot.
3. Purge partial output rows by `window_start/window_end` from stores.
4. Re-enable previous template version after root-cause closure.
