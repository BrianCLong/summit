# Auditor Mode & Evidence on Demand

Summit implements an "Auditor Mode" to allow deterministic, read-only access to compliance evidence.

## Principles

1.  **Read-Only:** Auditor mode never modifies state.
2.  **Time-Bounded:** Evidence is scoped to a specific audit window (e.g., Q3 2025).
3.  **Deterministic:** Running the extractor twice for the same parameters yields the same artifacts.
4.  **Self-Contained:** The output bundle contains everything needed for verification (logs, policies, configs).

## Usage

### Generating an Evidence Bundle

To generate an evidence bundle for a specific control or the entire scope:

```bash
# Generate evidence for all controls
npx tsx scripts/compliance/generate_evidence.ts --start-date 2025-01-01 --end-date 2025-03-31

# Generate evidence for a specific control
npx tsx scripts/compliance/generate_evidence.ts --control CC7.1 --start-date 2025-01-01 --end-date 2025-03-31
```

### Output Structure

The evidence is generated in `evidence/auditor-bundle-{timestamp}/`:

```
evidence/auditor-bundle-20251025/
├── manifest.json          # Metadata about the bundle
├── CC1.1/
│   ├── governance-docs/   # Snapshots of AGENTS.md, etc.
│   └── ownership.json
├── CC7.1/
│   ├── ci-logs/          # Sample CI logs
│   └── change-policy.md
└── report.html           # Human-readable summary
```

## Evidence Sources

- **Git History:** For change management and review evidence.
- **CI Artifacts:** For testing and security scan results.
- **Live Configuration:** For current policy settings.
- **Database (Sanitized):** For audit logs (e.g., `audit_events` table).

## Access Control

Auditor Mode requires the `auditor` role. This role provides read access to:

- `compliance/*`
- `logs/*`
- `policies/*`
- `provenance/*`

It explicitly denies access to:

- User PII
- Secrets/Keys
- Customer Data Content
