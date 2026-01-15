# Operator Runbook: Governance & Compliance Gates

**Version:** 1.0.0

This runbook consolidates instructions for operating, debugging, and fixing the platform's governance gates.

## 1. Quick Reference Table

| Gate Name | CI Job | Script | Purpose |
| :--- | :--- | :--- | :--- |
| **Evidence ID Consistency** | `ci:evidence-id-consistency` | `node scripts/ci/verify_evidence_id_consistency.mjs` | Ensures all docs cite valid Evidence IDs from the catalog. |
| **Governance Docs Integrity** | `ci:docs-governance` | `node scripts/ci/verify_governance_docs.mjs` | Verifies `INDEX.yml` matches `INDEX.md` and rules are consistent. |
| **SOC Evidence Report** | `ci:soc-report` | `python3 scripts/evidence/generate_soc_report.py` | Generates audit-ready evidence PDF/JSON for SOC2 controls. |
| **AI Determinism** | `ci:ai-replay` | `npm run ci:ai-replay` | Enforces that AI logic relies on recorded deterministic fixtures. |
| **GA Gate** | `ga:verify` | `node scripts/ga/ga-verify-runner.mjs` | Final release readiness check (includes all of above). |

## 2. Gate Details & Troubleshooting

### 2.1 Evidence ID Consistency
**Symptom:** CI fails with "Invalid Evidence ID".
**Fix:**
1. Check `docs/governance/evidence_catalog.json`.
2. If the ID is new, add it to the catalog (requires approval).
3. If the ID is a typo, fix the markdown file.
4. Run locally: `npm run ci:evidence-id-consistency`.

### 2.2 AI Determinism (Replay Gate)
**Symptom:** CI fails with "Cache miss for prompt..." or "Network access denied".
**Fix:**
1. You likely changed a prompt or code logic affecting AI inputs.
2. Run locally in **Record Mode**: `ENABLE_QWEN_RECORD=true npm run test:ai` (or specific test).
3. Commit the updated `replays/` JSON files.
4. Verify locally: `ENABLE_QWEN_REPLAY_ONLY=true npm run ci:ai-replay`.

### 2.3 SOC Evidence Report
**Symptom:** Checksum mismatch or generation failure.
**Fix:**
1. Ensure your environment is clean.
2. Run `npm run ci:soc-report`.
3. Check `dist/evidence` for artifacts.

## 3. Emergency Bypass
**Authorization:** Engineering Manager + Compliance Officer.
**Procedure:**
1. Add exception to `docs/governance/EXCEPTION_REGISTER.md`.
2. Reference exception ID in commit message.
