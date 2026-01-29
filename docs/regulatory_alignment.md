# Regulatory Alignment Matrix

This document maps Summit control defaults to key regulatory regimes.

## 1. EU AI Act
The EU AI Act introduces staged requirements for AI systems based on risk level.

- **Status**: Aligned with GPAI and transparency requirements.
- **Controls**:
  - `EU-CTRL-AUDIT-LOGS` -> implemented via `summit/governance/audit.py`
  - `EU-CTRL-HUMAN-OVERSIGHT` -> default policy in `governance/policy.json`

## 2. US Colorado SB24-205
Focuses on "reasonable care" to avoid algorithmic discrimination.

- **Status**: Deployment checklists and discrimination risk assessments integrated.
- **Required Evidence**: `governance/discrimination_risk.json`

## 3. US Federal Posture
Following the Jan 20, 2025 rescission of the 2023 AI EO, Summit maintains voluntary but enforceable standards aligned with the new national framework.
