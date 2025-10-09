## 🚀 Summit v0.1.0 — GA

**Highlights**
- Hardened Docker release (images pinned by digest, no-new-privileges, read-only where possible)
- Health-gated startup, DR drill + evidence bundle
- Observability bundle + SLO alerts (API down, 5xx ratio)

**Quick Start**
```bash
cp .env.example .env
make up && make verify       # core
make app && make smoke       # app
```

**Artifacts**

* `docker-compose.fresh.yml`, `docker-compose.app.yml`, `docker-compose.observability.yml`
* `.env.example`, `Makefile`, `docs/OPERATOR_READINESS.md`
* SBOMs & evidence (if attached)

**Ports (host)**
15432 Postgres • 16379 Redis • 17474/17687 Neo4j • 18080 Adminer • 18081 API • 18082 Web

**SLOs**
API avail ≥ 99.9% • 5xx < 1% monthly • DR drill ≤ 10m

**Support & Security**
See `SUPPORT.md` and `SECURITY.md` (48h ack / 30-day patch window)