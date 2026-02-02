# Required Checks Todo

The following checks are required for the Materials Redesign plugin but do not yet have permanent names in the CI system.

| Temporary Name | Description | Command |
| --- | --- | --- |
| `materials_roundtrip_test` | Verifies codec round-trip on valid inputs | `pytest tests/materials/test_codec.py` |
| `materials_invariants_test` | Verifies validators catch invalid inputs | `pytest tests/materials/test_validators.py` |
| `feature_flag_default_off` | Verifies pipeline does not run when flag is off | `python3 tests/materials/manual_pipeline_check.py` |
