# Summit Governance Audit Logs

This directory stores append-only, signed audit events for sensitive governance actions:

- policy validation and evaluations
- SBOM verification and signing
- deploy approvals and executions
- release artifact signing

Events should be recorded as line-delimited JSON (`.jsonl`) and signed using Sigstore (Fulcio + Rekor) wherever possible.

Example entry:

```
{"ts":"2025-12-03T10:22:00Z","actor":"github[bot]","action":"policy.test","policy":"summit.deploy","result":"pass","sha":"abcd..."}
```
