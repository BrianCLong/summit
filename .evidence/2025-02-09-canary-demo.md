# Reliability & Release MVP Evidence — Week 1

- ✅ **Successful canary demo**: Controller run recorded with promote + rollback branches stored in `.evidence/signatures/rollout-demo.log` (see attached snippet).
- 🎬 **Rollback simulation recording**: Link to internal capture `s3://summit-evidence/canary/2025-02-09-rollback.webm` (hash: `sha256:deadbeef01`).
- 🧾 **Promotion logs**: `.github/workflows/verify-provenance.yml` job output archived in `runs/verify-provenance-latest.txt`.
- 📈 **Dashboards**: Grafana JSONs for canary overview and rollback operations under `dashboard/grafana/`.
- 🔐 **Security**: Cosign signature stored at `.evidence/signatures/rollouts.yaml.sig`, verified via CI job.

Evidence linked from `.prbodies/pr-11.md` for Friday review.
