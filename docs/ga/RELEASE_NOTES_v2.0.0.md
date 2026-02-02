# Release Notes - Summit v2.0.0 (GA)

**Welcome to Summit v2.0.0!**
This release marks our General Availability milestone, bringing enterprise-grade stability, security, and the complete "Discernment" feature set to our partners.

## 🌟 Key Features

### IntelGraph Core

- **Full History Mode:** Query the graph at any point in time with `AS OF` syntax.
- **Bulk Ingest API:** 10x performance improvement for large datasets.

### Maestro Agents

- **"Glass Box" Governance:** Every agent action now produces a cryptographic receipt in the Provenance Ledger.
- **New Agent:** _Sentinel_ - autonomous monitoring for data drift.

### Security

- **Strict ABAC:** Attribute-Based Access Control is now enforced by default.
- **Sealed Secrets:** All secrets are encrypted at rest and in transit.

## 🐛 Bug Fixes

- Fixed race condition in user onboarding workflow.
- Resolved memory leak in WebSocket subscriptions.
- Corrected issue where graph exports were missing edge properties.

## ⚠️ Breaking Changes

- **API:** `POST /api/v1/graph/query` now requires `Content-Type: application/json`.
- **Config:** `ENABLE_LEGACY_AUTH` flag has been removed. You must use `unifiedAuth`.

## Upgrade Guide

See [UPGRADE.md](../UPGRADE.md) for detailed instructions on migrating from v1.9.x.
