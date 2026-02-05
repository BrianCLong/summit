# Repo Assumptions: BrianCLong/summit

| Category | Verified | Assumed |
| :--- | :--- | :--- |
| **Package Root** | `summit/` (contains sub-packages) | |
| **Test Framework** | `pytest` (Python), `jest` (JS/TS) | |
| **CI Provider** | GitHub Actions (`.github/workflows/`) | |
| **Check Names** | `Summit CI` (Python), `CI` (Node.js) | |
| **Evidence Schema** | `evidence/schemas/*.schema.json` | |
| **Evidence Artifacts**| `evidence/EVD-*/` | |
| **Logging Rules** | `observability/redaction/policy.yml` | |
| **Must-not-touch** | `pnpm-lock.yaml`, `third_party/` | |

## Suggested File Paths for MARS
Based on existing structure:
- Schemas: `evidence/schemas/mars-{plan,ledger,lessons}.schema.json`
- Implementation: `summit/mars/`
- Tests: `summit/tests/mars/`
- Monitoring: `scripts/monitoring/mars-drift.py`
- Docs: `docs/standards/mars-reflective-search.md`, etc.
