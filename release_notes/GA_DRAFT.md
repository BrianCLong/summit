# GA Release Notes (DRAFT)

**Version**: 1.0.0 (The "Summit" Release)
**Date**: [TBD]

## 🚀 The Headline

Summit IntelGraph is now Generally Available. This release marks the transition from "Experimental" to "Production Ready" for core intelligence workflows.

## ✨ Core Features (Tier-0)

- **Production-Grade Ingestion**: Validated connectors for SQL, CSV, and JSON with 10k/sec throughput.
- **Graph Intelligence Canvas**: Explore up to 10k nodes with zero lag. Tri-pane view for spatial, temporal, and relational analysis.
- **AI Copilot**: Natural Language to Graph Query (NL2Cypher) with citation-backed RAG.
- **Enterprise Security**: SSO, RBAC, and Immutable Audit Logs enabled by default.

## ⚠️ Breaking Changes & Migrations

- **API**: V0 endpoints (`/api/v0/...`) have been removed. Use V1 (`/api/v1/...`).
- **Schema**: The `Person` node label is now `PersonEntity` to avoid collisions. Run migration script `scripts/migrate_v0_to_v1.sh`.

## 🔒 Security Fixes

- Patched strict CSP headers.
- Enforced MFA for all Admin accounts.
- removed all default credentials.

## 📉 Known Issues

- Complex pathfinding queries (> 5 hops) may timeout after 30s.
- Mobile view is read-only.
