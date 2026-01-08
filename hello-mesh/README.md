# Hello Mesh Bootstrap Pack

This pack provisions seven stubbed services plus core observability components (Postgres, Redpanda via Kafka API, Prometheus, Grafana, Jaeger, and an OTEL collector) so teams can iterate independently.

## Contents

- `docker-compose.yml` — full topology with unique ports and env wiring.
- `services/*` — Alpine-based stubs exposing `/healthz`, `/readyz`, `/metrics`.
- `contracts/` — Avro + Protobuf contracts pinned to v1 namespaces.
- `ops/` — Prometheus, Grafana, and OTEL collector configs.
- `scripts/smoke.sh` — end-to-end readiness + metrics checker (invoked via `make smoke`).
- `ops/ci/pr-smoke.yml` — GitHub Actions workflow mirroring the smoke test.

## Quickstart

```bash
cd hello-mesh
cp .env.example .env
make up
make ps
# Hit a stub
curl localhost:8104/healthz
```

## Notes

- Stubs log requests and keep `/metrics` available for Prometheus scraping.
- Replace Dockerfiles + `stub_server.sh` in each service directory as real code arrives but keep ports/envs stable for infra reuse.
- Prometheus scrapes static targets; if you add new services, append them under `ops/prometheus/prometheus.yml` and expose `/metrics`.
