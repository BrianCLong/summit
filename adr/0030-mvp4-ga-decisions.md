# ADR 0030: MVP-4 GA Architectural Consolidation

## Status

Accepted

## Context

For MVP-4 GA (v4.1.4), we needed to unify the disparate components of the Summit Platform ("Split-Brain" architecture: Node.js Graph vs Python Maestro) to ensure reliability, governance, and operational simplicity suitable for government deployment (FedRAMP High target).

## Decision

1.  **Unified Control Plane:** Migrate all workloads to a single AWS EKS cluster.
    - _Rationale:_ Eliminates network latency between Orchestrator and Graph; simplifies IAM (IRSA) and security boundaries.
2.  **Maestro Orchestration:** Adopt `Maestro` (Python/FastAPI) as the canonical workflow engine for all long-running tasks.
    - _Rationale:_ Node.js event loop was insufficient for heavy AI/ETL processing. Python provides better ecosystem for AI.
3.  **DataEnvelope Protocol:** Enforce `DataEnvelope` wrapper on 100% of API responses.
    - _Rationale:_ Required for "Source-to-Verdict" traceability. Governance metadata must travel with the payload.
4.  **Error Budget Policy:** Adopt Burn-Rate Alerting based on Google SRE handbook.
    - _Rationale:_ Static thresholds were too noisy. Burn rates provide actionable signals for 99.9% availability targets.

## Consequences

- **Positive:** "One Platform" to deploy. Simplified audit.
- **Negative:** Higher initial K8s complexity for developers (mitigated by `summit doctor` and `Tilt`).
- **Compliance:** Architecture maps directly to NIST 800-53 controls (AC-3, AU-2, SA-8).
