# Competitive Intelligence Gate

## Overview

This gate ensures that all competitive intelligence dossiers and analysis files follow the **Competitive Intelligence Subsumption Policy**.

## Requirements

1. **Evidence-First**: All claims must be backed by evidence IDs (EVID-###).
2. **Changed Files Only**: The gate runs on markdown files modified in the current pull request.

## Implementation

- **Script**: `security/gates/gate_competitive_intel.py`
- **Job Name**: `Competitive Intel Gate`

## Failure Remediation

If this gate fails, ensure that your competitive intelligence dossier contains appropriate EVID references for all major claims. See `docs/governance/COMPETITIVE_INTEL_POLICY.md` for more details.
