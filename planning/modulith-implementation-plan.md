# Modulith Implementation Plan

1. **Initialize `summit/modulith` and Define Configuration**
   - Create `summit/modulith/` directory with `__init__.py`, `schemas.py`, and `config.py`.
   - Create `config/modules.yaml` to define the initial module dependency matrix and rules based on the user's requirements.
   - Implement configuration loading and validation in `summit/modulith/config.py` using `pydantic` and `yaml`.
   - Verify the creation of these files and directories using `list_files` and `read_file`.

2. **Implement Static Import Scanner**
   - Create `summit/modulith/scanner.py`.
   - Use the Python `ast` module to scan files in the `summit/` directory to identify all imports and their source module.
   - Build a graph of cross-module dependencies.
   - Create `summit/tests/modulith/test_scanner.py` with specific test cases for standard, relative, and cross-module imports.
   - Run `pytest summit/tests/modulith/test_scanner.py` to verify the scanner logic and ensure it correctly identifies imports.

3. **Develop Verifier and Deterministic Reporter**
   - Create `summit/modulith/verifier.py` to check the import graph against the dependency matrix and rules (e.g., `cross_module_requires_event`).
   - Create `summit/modulith/reporter.py` to generate `artifacts/modulith/report.json`, `metrics.json`, and `stamp.json` with deterministic timestamps.
   - Verify the generated artifacts using `read_file` to ensure they adhere to the required schema and are deterministic when the `CI` environment variable is set.
   - Create `summit/tests/modulith/test_verifier.py` and run it with `pytest` to verify the verification and reporting logic.

4. **Integrate with CI and Makefile**
   - Add a `modulith-check` target to the root `Makefile` that invokes the verifier and handles exit codes.
   - Create a CI gate script `scripts/modulith-gate.sh` that runs the verifier and fails on violations.
   - Execute `make modulith-check` to verify that the target correctly invokes the verifier and handles both success and failure states.

5. **Fix CI Regressions (pnpm and test paths)**
   - Remove conflicting `version: 9.12.0` from `pnpm/action-setup` in all active workflows (excluding `.archive/`).
   - Fix missing `tests/test_precision_flow_policy.py` in `.github/workflows/jetrl-ci.yml` (likely moved or deleted).
   - Add missing `eval-skills-changed` and `eval-skills-all` targets to `Makefile`.

6. **Documentation and Standards**
   - Create `docs/ops/runbooks/modulith.md` for operational guidance on handling violations.
   - Create `docs/security/data-handling/modulith.md` for security compliance.
   - Create `docs/standards/modulith-interop.md` for interoperability standards.
   - Verify all documentation files were created and contain relevant content.

7. **Final Project-wide Verification**
   - Run the full project test suite using `make test` and `pytest` to ensure that the new `summit.modulith` package works correctly and no regressions have been introduced.

8. **Complete pre-commit steps**
   - Ensure proper testing, verification, review, and reflection are done.

9. **Submit the changes**
   - Submit the implementation with a descriptive commit message.
