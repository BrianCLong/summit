# LUSPO Length-Unbiased SPO Standard (RLVR)

## Scope
This standard defines Summit's length-bias–aware RLVR objective option (LUSPO-style), deterministic length-collapse detection, and evidence artifacts. It aligns with the Summit Readiness Assertion for preemptive scrutiny handling and evidence-first delivery. See `docs/SUMMIT_READINESS_ASSERTION.md`.

## Claim Anchors (Ground Truth)
* Response-length changes differ across RLVR algorithms; length bias can cause response-length collapse.
* GRPO/GSPO show length bias under certain formulations/settings; LUSPO scales each sequence loss by its own length to neutralize bias.

## Import / Export Matrix

| Interface | Description |
| --- | --- |
| **Imports** | RLVR training logs (JSONL) with `step`, `response_len`, and optional extra fields; optional rewards/advantages are accepted but not required for length reporting. |
| **Exports** | Deterministic artifacts: `reports/length_report.json`, `reports/metrics.json`, `reports/stamp.json`, optional `reports/perf.json`. |

## Evidence ID Policy
Artifacts MUST embed evidence IDs in the format `EVID:lspo:<slug>:<hash>`, where `<hash>` is the SHA-256 of the input JSONL bytes.

## Determinism Requirements
* No timestamps in report or metrics artifacts.
* Stable key ordering and fixed precision.
* Hash chaining optional per line to deter tampering.

## Non-Goals
* Full reproduction of paper training results (GPU-heavy).
* Implementing every RLVR variant (GRPO/GSPO/DrGRPO/etc.) beyond minimal interfaces.

## MAESTRO Threat Model Alignment

**MAESTRO Layers:** Foundation, Data, Agents, Tools, Observability, Security.

**Threats Considered:**
* Length gaming via padding to exploit length scaling.
* Artifact poisoning via tampered JSONL logs.
* Sensitive data leakage via log ingestion.
* Non-deterministic reporting.

**Mitigations:**
* Optional `max_len` cap with overlong ratio monitoring and penalty hooks.
* Schema validation with optional hash chaining per line.
* Redaction hooks and never-log enforcement.
* Deterministic serialization with fixed precision and no timestamps.
