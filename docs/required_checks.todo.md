# Required Checks Discovery & Mapping

This document tracks the required CI checks for branch protection and maps them to Summit's evidence system.

## Branch Protection Goals
- [ ] `ci/summit-evidence-validate` (maps to `python ci/verify_evidence.py`)
- [ ] `ci/summit-determinism` (maps to `python ci/verify_determinism.py`)
- [ ] `ci/summit-dependency-delta` (maps to `python ci/verify_dependency_delta.py`)
- [ ] `ci/summit-unit` (maps to `pytest tests/multilingual/`)

## Discovery Steps
1. Navigate to GitHub Settings > Branches.
2. Under "Branch protection rules", click "Edit" on `main`.
3. Check the "Require status checks to pass before merging" section.
4. Add the names above once verified in CI.

## Evidence Mapping
| Evidence ID | Description | CI Gate |
| ----------- | ----------- | ------- |
| EVD-ATLAS-SCHEMA-001 | Evidence schema pack present & validates | `ci/summit-evidence-validate` |
| EVD-ATLAS-PLNR-001 | Planner interface contract tests | `ci/summit-unit` |
| EVD-ATLAS-XFER-001 | Transfer matrix artifact validation | `ci/summit-unit` |
| EVD-ATLAS-ATLS-001 | ATLAS heuristics validation | `ci/summit-unit` |
| EVD-ATLAS-GOV-001 | Governance + dependency-delta gate | `ci/summit-dependency-delta` |
