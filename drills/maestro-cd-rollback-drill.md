# Maestro CD Rollback Drill Evidence

- **Date:** 2025-12-19 (UTC)
- **Scenario:** Exercise `cd-rollback.yml` for Maestro orchestrator rollback
- **Target environment:** staging
- **Requested image tag:** `<stable-image-tag>` (placeholder; choose last known good)

## Attempt

- Intended command: `gh workflow run cd-rollback.yml --ref main -f environment=staging -f image_tag=<stable-image-tag>`
- Result: Not executed in this workspace because GitHub CLI (`gh`) is not installed and no GitHub token/secrets are available in the environment to authorize the dispatch.

## Next steps to execute in real environment

1. Install GitHub CLI and authenticate with a token that has `workflow` scope.
2. Run the command above from a machine with network access.
3. Monitor **Actions → CD Rollback** for job status; confirm compose pull/up completes.
4. Validate Maestro health and Prometheus alerts clear post-rollback.
5. Attach console output and timestamps back to this evidence file.

_This entry records the planned drill and current blocker so it can be completed once credentials are available._
