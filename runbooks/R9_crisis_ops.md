# R9 Crisis Operations

## Purpose
Coordinate rapid response during crisis events with offline readiness, provenance assurance, and operational guardrails.

## Inputs
- Offline kit bundle with redacted demo data.
- Pre-approved authority token and escalation contacts.
- SLO dashboard links and chaos drill playbooks.

## Steps
1. Activate offline kit; verify checksums and manifests before use.
2. Run NL→Cypher preview in sandboxed mode; confirm cost guard budgets and policy gates still enforced offline.
3. Use tri-pane to monitor evolving signals; annotate rationale overlays and freeze critical paths.
4. Execute chaos drill harness (pod/broker kill) to validate resilience; record outcomes in audit.
5. Produce crisis report with selective disclosure bundle and manifest wallet reference.

## KPIs
- Offline activation <5 minutes with checksum verification.
- Zero lost audit events during drill; p95 latency <1.5s sustained.
- Crisis report delivered with manifests and license decisions attached.

## Failure Modes
- Budget exhaustion: trigger appeal and shift to archival tier queries.
- Connectivity loss: remain in offline kit; queue audit entries for later upload.
- Policy mismatches: regenerate policy bundle checksum and rerun verifier CLI.

## XAI Notes
- Document rationale paths and decision appeals; include overlay screenshots for post-incident review.
