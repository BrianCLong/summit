# Release Workflow Documentation

## Security Hardening

The release workflow (`release-ga.yml`) includes several security hardening measures:

*   **Least Privilege:** Token permissions are explicitly set to read-only by default, with write permissions granted only to the specific release job that requires them.
*   **SHA Pinning:** All third-party actions are pinned to specific immutable commit SHAs to prevent supply-chain attacks via tag hijacking.
*   **Fork Guard:** The release publishing step is explicitly disabled on forks to prevent accidental unauthorized releases.
*   **Safety Checks:** The workflow verifies the tag format and repository identity before attempting to publish.
