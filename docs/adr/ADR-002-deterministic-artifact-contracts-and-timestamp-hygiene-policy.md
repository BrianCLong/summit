# ADR-002: Deterministic Artifact Contracts and Timestamp Hygiene Policy

## Status
Accepted

## Context
A key goal of the Summit repository is to maintain a completely deterministic build and validation pipeline. Non-deterministic data, especially timestamps, embedded inside evidence reports or security ledger entries can cause unnecessary git diffs, break CI reproducibility, and create noisy pull requests. We need a systematic way to handle dynamic metadata (like execution time) without polluting core validation artifacts.

## Decision
We enforce strict deterministic artifact contracts across all JSON/YAML evidence files in `evidence/` and security ledger entries in `security-ledger/`:

1.  **Strict Timestamp Hygiene:** Wall-clock timestamps are strictly forbidden in core evidence report schemas. Core artifacts must only contain the deterministic results of a process (e.g., pass/fail status, metric counts).
2.  **Report/Stamp Separation:** Time-sensitive metadata is segregated into dedicated "stamp" schemas (e.g., `stamp.json`). These stamps link to their parent evidence report but are stored or processed separately to preserve the determinism of the report itself.
3.  **ISO-8601 UTC Standard:** When timestamps are required (such as in governance records or stamps), they must strictly adhere to the ISO-8601 UTC format without milliseconds (e.g., `YYYY-MM-DDTHH:MM:SSZ`) to ensure uniform machine readability.

These contracts are mechanically validated via JSON Schema validators in CI (e.g., `scripts/determinism/validate_evidence_contracts.py` and `scripts/determinism/validate-security-ledger.sh`).

## Consequences

**Positive:**
-   **Build Reproducibility:** Re-running checks on unchanged code produces identical artifacts, preventing cache busts and false-positive diffs.
-   **Cleaner Diffs:** Pull requests do not contain spurious line changes due to execution time variations.
-   **Machine Verification:** The separation of concerns allows validation scripts to strictly enforce what data is permitted in which file.

**Negative:**
-   **Implementation Overhead:** Developers must maintain two separate structures (report and stamp) when recording the outcome of a process.
-   **Schema Complexity:** Requires rigid JSON schema definitions in `schemas/evidence/` and `schemas/governance/` to enforce the rules.
