# Prompt: GDELT GKG Deploy Pack (Summit)

## Objective

Expand the Summit GDELT GKG architecture from conceptual guidance into deployable assets that can
be executed for a first production slice.

## Requirements

- strengthen architecture doc with implementation references and governed controls;
- add deterministic BigQuery SQL templates for table creation, extraction, and batching;
- add JSON schemas for narrative batch and alert artifacts;
- provide a first-slice deployment guide with validation and rollback;
- update roadmap status to track this initiative.

## Outputs

- `docs/architecture/gdelt-gkg-narrative-signal.md`
- `docs/architecture/gdelt/gdelt-gkg-first-slice-deploy.md`
- `narratives/gdelt/README.md`
- `narratives/gdelt/sql/001_create_internal_tables.sql`
- `narratives/gdelt/sql/010_slice_cyber_finance_60m.sql`
- `narratives/gdelt/sql/020_build_narrative_batches.sql`
- `schemas/osint/gdelt-narrative-batch.schema.json`
- `schemas/osint/gdelt-narrative-alert.schema.json`
- `docs/roadmap/STATUS.json`
- `prompts/architecture/gdelt-gkg-deploy-pack@v1.md`
- `prompts/registry.yaml`
