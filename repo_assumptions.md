# Repository Assumptions & Verification

## Verified
*   **Workflows:** `.github/workflows/sbom-scan.yml` exists and uses `anchore/sbom-action` (Syft).
*   **Melange Usage:** `melange` is NOT explicitly referenced in the codebase (based on grep).
*   **Directory Structure:** `.github/scripts/` exists. `docs/` structure exists.

## Assumptions
*   **Proactive Hardening:** We are implementing Melange gates (version, config lint) proactively.
*   **Workflow Target:** We will integrate these gates into `.github/workflows/sbom-scan.yml` as optional or conditional checks, or enforcement if Melange is introduced.
*   **Toolchain:** The version gate script assumes `melange` binary might be present in the runner; if missing, it should handle that (pass or skip, as no tool means no vulnerability).
