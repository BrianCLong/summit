# Competitor Signal Pack Standard: reddit-ma-adtech-2026-02-06

This standard defines the deterministic ingest and evidence outputs for the Reddit M&A + AI-search
competitor signal pack. Summit Readiness Assertion applies for release gating and evidence posture.

## Purpose

Capture machine-verifiable competitor intent signals with deterministic artifacts that can be
diffed nightly for drift.

## Import/Export Matrix

| Layer | Details |
| --- | --- |
| Inputs | TechCrunch HTML (M&A intent, AI search), Reddit IR release HTML, Reuters earnings coverage (optional corroboration). |
| Outputs | `report.json`, `evidence.json`, `drift.json`, `metrics.json`. |
| Non-goals | Scraping paywalled transcripts; predicting future M&A; tracking personal data. |

## Determinism Rules

- Stable key ordering in all JSON artifacts.
- No timestamps in report/evidence/drift artifacts.
- Signal IDs follow `EVI-<slug>-<nnn>` ordering derived from source + claim order.

## Evidence Policy

- Evidence must reference canonical URLs and snippet hashes.
- Source claims remain verbatim-lean with explicit provenance.
- Material drift is any change to the `signals` array.

## Threat-Informed Requirements (Deny-by-Default)

| Threat | Mitigation | Gate | Test |
| --- | --- | --- | --- |
| Source spoofing / link rot | Capture canonical URL + snippet hash for every claim. | CI drift check flags hash changes. | Drift run with altered snippet produces `material=true`. |
| Prompt injection via HTML | Strip scripts/styles; parse text-only payloads. | Safe HTML parser helper in ingestion pipeline. | Fixture containing `<script>` is stripped in unit test. |
| Non-deterministic outputs | Stable ordering; no timestamps in artifacts. | Determinism checks in ingest + drift jobs. | Golden-file comparison for report/evidence. |

## Roll-Forward Plan

- New competitor items are added as new signal packs without schema churn.
- Existing pack fields are backward compatible; extensions require versioned schema updates.
