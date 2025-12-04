# Golden Path Checklists

## Definition of Ready (DoR)
- [ ] Repo created from `templates/golden-service-ts`.
- [ ] `package.json` updated with service details.
- [ ] CI workflow (`.github/workflows/SERVICE.yml`) configured.
- [ ] `slos/slos.yaml` defined.
- [ ] Feature flags initialized in `src/features.ts`.

## Definition of Done (DoD)
- [ ] CI pipeline passes (Test, Lint, Security, SBOM).
- [ ] Code coverage > 80%.
- [ ] Docker image built and signed.
- [ ] Health check returns 200.
- [ ] Metrics exposed at `/metrics`.
- [ ] Dashboard created from `dashboards/grafana.json`.
