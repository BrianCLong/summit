# Materials Redesign Plugin

## Overview

The Materials Redesign plugin implements a clean-room version of the "SynCry" pattern:
1.  **Invertible structure-text codec**: Converts crystal structures to text and back (round-trip guaranteed).
2.  **Redesign loop**: Proposes edits to structures.
3.  **Deny-by-default gating**: Transformations are rejected unless they pass structural + policy invariants.

## Usage

Set `SUMMIT_MATERIALS_REDESIGN=1` to enable the pipeline.

### Inputs

The pipeline accepts a string input in the canonical `StructureText` format:
```
LATTICE: 1.0 2.0 3.0
SPECIES: Si O
COORDS: 0.0 0.0 0.0; 0.5 0.5 0.5
```

### Outputs

Evidence packs are generated in `evidence/<run_id>/`:
- `report.json`: Inputs, outputs, validator results.
- `metrics.json`: Acceptance/rejection counts.
- `stamp.json`: Metadata (Git SHA, timestamps).

## Security & Governance

- **Data Classification**: All inputs are treated as `public` by default unless specified otherwise.
- **Dependency Control**: No new dependencies are allowed without updating `deps/dependency_delta.md`.
- **Feature Flag**: `SUMMIT_MATERIALS_REDESIGN` defaults to `0` (disabled).

## Evidence IDs

- `EVD-HARDMATSLLM-MAT-001`: Codec round-trip proof.
- `EVD-HARDMATSLLM-MAT-002`: Validator deny-by-default proof.
- `EVD-HARDMATSLLM-MAT-003`: Pipeline execution proof.
