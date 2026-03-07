# Evidence ID Consistency Gate v1.3.0 - Qwen Patches General Availability

## Release Summary

This release delivers the complete Evidence ID Consistency Enforcement gate with AI-powered patch generation using Qwen models via DashScope.

## P0 Hardening Features

- ❄️ Deterministic caching with SHA-256 keys for reproducible builds
- 🔒 Replay-only mode enforcement in CI environments to prevent network calls
- 🛡️ Secrets/PII redaction before AI processing to prevent data leakage
- 📜 Hash-only audit ledger (ai_ledger.json) with no content leakage
- 📋 Stable file enumeration with deterministic ordering for consistency

## P1 Value-Add Features

- 🏷️ Prompt versioning with locked versions for consistent behavior
- 🔍 Orphaned evidence ID detection (registry entries with no document references)
- 🧩 Structured AI analysis with JSON format validation and parsing

## P2 AI Patch Generation

- 📝 Unified diff generation with RFC-compliant format
- 📦 Individual per-suggestion patches in `ai_patches/<id>.patch`
- 📑 Aggregated `bundle.patch` for bulk application
- 📊 Deterministic `index.json` with stable, sort-order guaranteed entries
- ✅ Validation layer in `validation.json` for patch applicability assessment
- 👁️ Safety filtering to prevent secret/PII leakage in patch content

## Artifact Structure

- `artifacts/governance/evidence-id-consistency/<sha>/report.json` - Deterministic content only
- `report.md` - Human-readable summary
- `stamp.json` - Runtime metadata (timestamp, exit status, generator)
- `ai_ledger.json` - Audit trail (hash-only, no content)
- `ai_patches/` - Patch generation output directory

Note: Timestamps are included in `stamp.json` only to maintain runtime context without compromising report determinism.
