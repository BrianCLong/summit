# Supply Chain Guardrails Architecture

## Overview
This subsystem provides deterministic, policy-as-code gates to secure the software supply chain against AI-driven threats and OSS malware. It implements the "Solid Gate" engineering standard by producing machine-verifiable evidence artifacts.

## Key Components

### 1. `packages/supplychain-guard`
A TypeScript library containing:
- **Schema**: Defines `EvidenceReport`, `EvidenceMetrics`, and `EvidenceStamp`.
- **Evidence Writer**: Deterministic JSON serialization to ensure stable artifacts.
- **Runner**: A uniform harness (`runGate`) for executing policy checks and writing evidence.
- **Gates**: Individual policy modules (e.g., AI Grounding, Dependency Intake).

### 2. CI Integration (`scripts/ci/`)
Scripts that act as entry points for GitHub Actions.
- `run_supplychain_gate.mjs`: Generic wrapper to execute TypeScript gates via `tsx`.

### 3. Evidence Artifacts (`artifacts/supplychain/`)
All gates produce strict JSON artifacts:
- `report.json`: detailed findings (pass/fail).
- `metrics.json`: execution duration and finding counts.
- `stamp.json`: timestamp and evidence ID.

## Evidence ID Format
`EVID:SUPPLYCHAIN:<gate-slug>:v1`

## Gates
1. **AI Upgrade Grounding**: Verifies that AI-suggested dependency upgrades actually exist in the registry.
2. **Dependency Intake**: Blocks denylisted packages and applies heuristics (e.g., typosquatting).
3. **Dev Threat Audit**: Scans for suspicious patterns (e.g., PowerShell backdoors) in repo artifacts.
