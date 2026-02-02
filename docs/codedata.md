# CodeData Framework: Some Data Should Be Code

Based on the principle that many "static" DSLs (YAML, JSON, CSV) hit an abstraction ceiling, Summit employs a **CodeData** framework. This allows complex configurations to be defined in **typed code** (Python) that **emits** static artifacts used by the runtime.

## Directory Structure
- `codegen/summit_codegen/`: Internal library for deterministic emits.
- `codegen/generators/`: Project-specific generators.
- `generated/`: Committed output artifacts (the "assembly").
- `schemas/generated/`: JSON Schemas for validating generated artifacts.
- `tools/codegen_check.py`: CI gate to ensure `generated/` is up to date.
