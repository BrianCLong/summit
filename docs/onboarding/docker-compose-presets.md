# Docker Compose Presets (Isolated Developer Environments)

These presets provide repeatable, isolated environments so you can switch between lightweight database testing, full-stack UI/API work, or observability drills without polluting other Docker Compose projects on your machine.

## Presets at a glance

| Preset  | Compose files used                                                | When to use                                                         |
| ------- | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| minimal | `docker-compose.minimal.yml`                                      | Fastest boot; datastores + migrations for backend/connector work.   |
| full    | `docker-compose.minimal.yml` + `docker-compose.dev.yaml`          | UI/API end-to-end flows with the standard Summit dev stack.         |
| obs     | `docker-compose.minimal.yml` + `docker-compose.observability.yml` | Troubleshooting/logging/metrics drills alongside the core services. |

All presets run under the project name `summit-onboarding` to prevent collisions with other Compose projects.

## Step-by-step usage

1. **Prerequisites**: Docker Engine/CLI, Docker Compose v2, and at least 8 GB RAM available for containers.
2. **Bootstrap env** (copies `.env.example` if missing):
   ```bash
   scripts/onboarding/compose-presets.sh ps minimal || true
   ```
3. **Start a preset**:
   ```bash
   scripts/onboarding/compose-presets.sh up <minimal|full|obs>
   ```
4. **Check status and logs**:
   ```bash
   scripts/onboarding/compose-presets.sh ps <preset>
   scripts/onboarding/compose-presets.sh logs <preset>
   ```
5. **Tear down cleanly** (removes volumes for the preset):
   ```bash
   scripts/onboarding/compose-presets.sh down <preset>
   ```

## Notes & tips

- The script guards for missing Docker/Compose and fails fast with actionable errors.
- `full` builds images locally; first run will take longer than subsequent boots.
- Use `COMPOSE_DEV_FILE=docker-compose.dev.yaml make dev-smoke` to run targeted smoke checks against the `full` preset.
- If you need a fresh data slate, run `down` before `up` to drop volumes and rerun migrations.
