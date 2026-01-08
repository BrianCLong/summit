# Maestro cd-rollback drill (dry-run)

- Timestamp (UTC): 2025-12-19T19:46:01Z
- Workflow: .github/workflows/cd-rollback.yml
- sha256: ff817062707c23db324cd5db6e885d414d2f49028e043b9c29ebdc49e75c61f4
- Execution mode: dry-run (sandbox lacks Docker/SSH/kubectl access; verified workflow path and commands)
- Intended trigger: gh workflow run cd-rollback.yml -f environment=staging -f image_tag=rollback-drill

## Workflow steps validated

- Checkout code
- Login to GHCR
- Rollback deployment

## Observations

- Workflow pulls the requested tag from GHCR, recreates server/client via docker compose on the target host, and prunes unused images.
- Use this workflow for staged rollback drills; confirm secrets and host reachability before running in prod.
