# Summit v0.1.0 — GA Announcement

## Subject: Summit v0.1.0 — GA, hardened, and ready for production

Hi all,

We've finalized **Summit v0.1.0** for General Availability. This release delivers a production-hardened Docker deployment with:

- **Security by default:** images pinned by digest, non-root containers, no-new-privileges, read-only FS where applicable.
- **Operational maturity:** health-gated startup, DR drill scripts, profile-based deployments, CI guardrails (sentinel/config-contract).
- **Observability:** Prometheus/Grafana bundle and SLO-based alerts.
- **Trust artifacts:** SBOMs, provenance hooks, and a complete operator runbook.

Quick start:
```bash
make up && make verify && make app && make smoke
```

Access URLs and ports, SLOs, DR guidance, and support processes are summarized in the *Operator Readiness* one-pager and the repository README.

We'll run a 0.1.x patch train for docs/observability refinements while keeping API/schema stable.

— Team Summit