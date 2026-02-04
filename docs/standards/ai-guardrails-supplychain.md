# Standard: AI Guardrails for Supply Chain Security

## Overview
This standard defines the requirements for preventing AI-driven attacks on the software supply chain, including hallucinated dependencies and automated malware injection.

## Claim Registry

| Claim ID | Description | Source | Gate |
|---|---|---|---|
| ITEM:CLAIM-01 | OSS malware grew 75% in 2025. | Sonatype | Dependency Intake |
| ITEM:CLAIM-03 | GPT-5 hallucinated 27.8% of versions. | Sonatype | AI Upgrade Grounding |
| ITEM:THREAT-04 | KONNI uses AI-generated PowerShell backdoors. | Check Point | Dev Threat Audit |

## Requirements

### 1. Deterministic Verification
All supply chain gates must produce deterministic, machine-verifiable evidence artifacts (JSON) in `artifacts/supplychain/`.
- Format: `report.json` (findings), `metrics.json` (perf), `stamp.json` (provenance).

### 2. AI Upgrade Grounding
- **Gate**: `ai-upgrade-grounding`
- **Rule**: All dependency upgrades suggested by automated tools must be verified against the official registry before merge.
- **Failure Mode**: Block merge if version does not exist.

### 3. Dependency Intake
- **Gate**: `dependency-intake`
- **Rule**: All dependencies in `package.json` must be checked against the Summit Denylist and heuristic patterns (e.g., suspicious length).
- **Failure Mode**: Block merge on Critical findings.

### 4. Developer Threat Audit
- **Gate**: `dev-threat-audit`
- **Rule**: Repository artifacts (scripts, templates) must be scanned for known threat actor patterns (e.g., encoded PowerShell).
- **Failure Mode**: Block merge on positive match.

## Governance
These gates are registered in `docs/governance/SECURITY_LEDGER.md` and their evidence is included in the release bundle.
