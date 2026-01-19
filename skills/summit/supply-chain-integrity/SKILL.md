# Supply Chain Integrity Skill

This skill enforces supply chain security best practices.

## Rules

1.  **Require pinned deps where feasible.**
    *   Do not use ranges in `package.json` (e.g., use `1.2.3`, not `^1.2.3`).
    *   Always commit the lockfile (`pnpm-lock.yaml`, `Cargo.lock`).

2.  **Require SBOM generation steps.**
    *   Ensure build pipelines generate an SBOM.

3.  **Add provenance attestation hooks.**
    *   Ensure provenance generation scripts are called in release workflows.

4.  **Enforce “trusted vs untrusted” workflow separation patterns.**
    *   Untrusted input (PRs from forks) should run in restricted contexts.
