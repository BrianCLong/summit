# Synthetic Monitoring

This directory captures synthetic flows that must run before first deploy for each service scaffolded via Railhead.

- HTTP API template: `templates/golden-path/http-api/synthetics/http_api_health.json`
- Worker template: `templates/golden-path/worker/synthetics/queue_depth.json`
- UI template: `templates/golden-path/ui/synthetics/ui_availability.json`

Copy the relevant probe into your service repo and register it with the observability platform.
