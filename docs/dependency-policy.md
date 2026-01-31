# Dependency Policy & Supply Chain Governance

To maintain a secure and stable supply chain, Summit enforces strict policies on adding or updating dependencies.

1. **Delta Acknowledgement**: Any change to dependencies must be accompanied by an entry in `DEPENDENCY_DELTA.md`.
2. **CI Enforcement**: `tools/check_dep_delta.py` script runs in CI.
