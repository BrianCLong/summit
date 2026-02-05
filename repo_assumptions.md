# Repo Assumptions & Reality Check

## Verified Repo Layout
*   **Python Package Root:** `summit/` (located at repo root, not `src/summit/`).
*   **Tests:** `summit/tests/` (using `pytest`).
*   **CI Configuration:** `.github/workflows/summit-ci.yml` (runs `pytest` on `summit/tests/`).
*   **Dependencies:** `requirements.in`.

## Validation Checklist (Passed)
1.  [x] Confirm package root: `summit/` at root.
2.  [x] Confirm CI check names: `test-python` in `summit-ci.yml`.
3.  [x] Confirm existing evidence schema: `evidence/` folder exists.
4.  [x] Identify must-not-touch: `SECURITY.md` (if exists), `requirements.in` (unless necessary).

## Path Mappings
*   `src/summit/frontier` -> `summit/frontier`
*   `tests/` -> `summit/tests/`
