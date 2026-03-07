# [DX] Docker Compose stack for Summit OSINT demo

## Checklist

- [ ] Define `docker-compose.yml` standing up IntelGraph, Maestro, CompanyOS, Switchboard, and dependencies (DB, cache, etc.)
- [ ] Provide sane `.env.example` with required environment variables and defaults
- [ ] Integrate a small local LLM + RAG slice (configurable) for analyst-assist summaries in the demo flow
- [ ] Ensure `docker compose up` + one command triggers the OSINT lead publication E2E test
- [ ] Add CI job to build and smoke-test the Compose stack on each main branch change
- [ ] Update README with a “Quickstart: OSINT control-plane demo via Docker Compose” section
