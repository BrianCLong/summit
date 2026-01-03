# Ops Evidence Index

This document tracks all generated Operational Evidence Packs (weekly cadence, releases, incidents, and ad-hoc runs). It serves as the master registry for operational audit trails.

## Purpose

The **Ops Evidence Index** provides a human-readable and machine-verifiable log of every evidence artifact produced by the platform. This ensures that:

1.  **Auditors** can find the definitive evidence for any given time period.
2.  **Operators** can verify that required evidence (e.g., weekly compliance checks) was actually generated.
3.  **Tooling** can programmatically validate that the chain of evidence is unbroken.

## Schema

The master source of truth is `EVIDENCE_INDEX.json` in this directory.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | string | Unique ID: `<UTC_TIMESTAMP>*<SHORTSHA>` or `<YEAR>-W<WW>*<SHORTSHA>`. |
| `kind` | enum | `weekly`, `release`, `incident`, `ad-hoc`. |
| `generated_at_utc` | string | ISO8601 timestamp of generation. |
| `commit_sha` | string | Full git SHA of the codebase at generation time. |
| `ref` | string | Git reference (e.g., `main`, `v1.2.3`). |
| `status` | enum | `pass`, `fail`, `partial`. |
| `artifact` | object | Details about the stored evidence pack. |
| `artifact.type` | enum | `workflow_artifact`, `release_asset`, `external_storage`. |
| `artifact.reference` | string | URL or URI to retrieve the artifact (no secrets). |
| `artifact.sha256` | string | (Optional) SHA256 checksum of the artifact. |
| `notes` | string | (Optional) Brief context or explanation. |
| `related` | object | (Optional) `release_tag`, `iso_week`, `incident_id`. |

## Adding Entries

Entries should be added manually after generating an evidence pack, or via the `emit-evidence-index-entry` workflow helper.

1.  **Generate** the evidence pack (via CI, Release, or Manual Workflow).
2.  **Add** a new object to the top of the array in `EVIDENCE_INDEX.json`.
3.  **Update** the table below with the same information.
4.  **Validate** using `scripts/verification/verify_ops_evidence_index.ts`.

## Retention

Evidence entries in this index are retained indefinitely as part of the git history. The referenced artifacts (e.g., GitHub Workflow Artifacts) may have a shorter retention period (typically 90 days), after which they should be moved to long-term storage if required by policy.

## Evidence Log

| Date (UTC) | Kind | Ref/Tag | Commit | Status | Artifact Reference | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 2025-10-15T12:00:00Z | weekly | main | 0000000... | pass | [Action Run](https://github.com/BrianCLong/summit/actions/runs/0) | Example entry (can be removed) |
