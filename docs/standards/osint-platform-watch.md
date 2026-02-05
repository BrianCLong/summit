# OSINT Platform Watch Standard

## Purpose
Define the deterministic Platform Watch pipeline that ingests OSINT platform signals, generates
machine-verifiable artifacts, and detects claim drift.

## Inputs
- Allowlisted vendor sources (official docs, release notes, announcements).
- User-provided daily summaries (ITEM-like claim feeds).

## Outputs
- `artifacts/platform-watch/<YYYY-MM-DD>/report.json`
- `artifacts/platform-watch/<YYYY-MM-DD>/report.md`
- `artifacts/platform-watch/<YYYY-MM-DD>/metrics.json`
- `artifacts/platform-watch/<YYYY-MM-DD>/stamp.json`
- `artifacts/platform-watch/<YYYY-MM-DD>/kg.json`

## Determinism Requirements
- No timestamps in artifacts. Date-only stamps are required.
- Stable ordering of lists and stable JSON serialization.
- Evidence IDs follow `EVD-PLAT-<platform>-<yyyymmdd>-<hash8>`.

## Evidence ID Conventions
- `platform` is normalized uppercase with dashes.
- `yyyymmdd` is the report date (UTC date).
- `hash8` is the first 8 chars of the content SHA-256.

## Drift Detection
- Drift is flagged when a no-change claim conflicts with evidence containing update signals.
- Drift reasons must include claim ID and evidence ID.

## KG Mapping
- Platform nodes connect to Evidence and Claim nodes.
- Edges use deterministic IDs derived from node IDs and dates.

## Compliance
- Allowlist-only collection.
- Sanitization and redaction applied to all text.
- No HTML passthrough in Markdown.
