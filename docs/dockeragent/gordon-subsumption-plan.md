# Docker Gordon Update — Summit Subsumption Plan

## Executive Intent

Summit will introduce a deterministic, policy-gated Docker analysis copilot that focuses on secure Dockerfile and Compose review, evidence-first reporting, and optional machine-verifiable remediation plans behind a feature flag.

## Ground Truth Claims (Public Blog Derived)

- Gordon is an AI agent integrated with Docker workflows.
- Gordon assists with container configuration and troubleshooting.
- Recent updates improve workflow integration and usability.
- The experience is embedded in Docker tooling (Desktop/CLI context).
- The positioning is developer productivity enhancement.

## Minimal Winning Slice (MWS)

> Summit can analyze a Docker project directory, produce a deterministic security + optimization report, and optionally generate a machine-verifiable remediation plan.

## Architecture Additions

```text
/internal/dockeragent/
  analyzer.go
  remediation.go
  evidence.go

/cmd/summit/dockeragent.go

artifacts/dockeragent/
  report.json
  metrics.json
  stamp.json
```

## PR Stack (Hard Stop: 6 PRs)

1. **Scaffold Docker agent module**
   - `internal/dockeragent/analyzer.go`
   - `internal/dockeragent/evidence.go`
   - `cmd/summit/dockeragent.go`
2. **Deterministic Dockerfile linter**
   - Rules: `latest`, root user, missing `HEALTHCHECK`, unpinned base image
   - Output: deterministic `report.json`
3. **Compose analyzer + gate**
   - Rules: privileged mode, unbounded memory, exposed ports
   - CI gate: `summit-docker-policy`
4. **AI remediation plan (flag default OFF)**
   - CLI switch: `--enable-ai-remediation`
   - Output: deterministic `remediation.json` with source attribution
5. **CI integration**
   - Workflow: `.github/workflows/dockeragent.yml`
   - Budget: <=30s runtime, <=200MB memory
6. **Drift monitoring and operations**
   - `scripts/monitoring/dockeragent-drift.sh`
   - `docs/ops/runbooks/dockeragent.md`

## Threat-Informed Requirements

| Threat | Mitigation | Gate | Test Fixture |
| --- | --- | --- | --- |
| Malicious Dockerfile | Static lint | CI hard fail | `evil-root.Dockerfile` |
| Privileged container | Compose scan | CI hard fail | `privileged.yml` |
| CVE drift | SBOM scan | Metrics threshold | `test-cve.json` |

Unknown directives follow deny-by-default behavior.

## Data Handling Rules

- Never log image digests.
- Never log registry credentials.
- No external network calls unless explicitly enabled.
- AI remediation mode must redact secrets in outputs.

## Non-Goals

- Runtime container execution.
- Dynamic malware analysis.
- Real-time orchestration/debugging parity claims.

## Definition of Done

Target score: **23/25** across determinism, machine verifiability, mergeability, security posture, and measured advantage.

## MAESTRO Alignment

- **MAESTRO Layers:** Tools, Infra, Observability, Security.
- **Threats Considered:** Prompt/tool abuse, policy bypass, unsafe config propagation.
- **Mitigations:** Deterministic outputs, CI policy gates, feature-flag default OFF, artifact-based evidence bundle.
