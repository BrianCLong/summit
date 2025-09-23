# Sprint 26 Test Plan

## Objectives
Validate SLSA-4 provenance, ZK proof performance and policy enforcement for marketplace runs.

## Test Areas
- **Supply Chain**: verify in-toto provenance, SBOM match and dual signatures.
- **ZK Proof Kit**: ensure proof latency p95 < 10s and artifact size < 50KB (fixtures).
- **OPA Gates**: reject runs missing proofs or with `k < 25`, epsilon overspend, or row exports.
- **Auto-Unlist**: simulate three violations in 30 days and confirm publisher removal.

## Tools
- Jest for unit tests.
- OPA for policy evaluation.
- Prometheus/Grafana for latency and size metrics.

## Reporting
Record results in dashboards and include failures in release notes.
