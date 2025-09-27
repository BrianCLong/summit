# IntelGraph Infrastructure Overview

- Helm charts under `helm/` for all services with ingress, HPA, PDB, ServiceMonitor support.
- Terraform under `terraform/` with modules for EKS, RDS Postgres, S3 backups; envs for staging/prod.
- CI/CD via `.github/workflows/ci-cd.yml`: build, test, scan, push to GHCR, deploy to staging/prod with rollout checks and rollback.
- Monitoring via kube-prometheus-stack values; custom rules in `k8s/monitoring/rules`.
- Logging via Fluent Bit DaemonSet to OpenSearch in `k8s/logging`.
- Security: Trivy scans, Falco, Gatekeeper policies, kube-bench job.
- Backups: CronJobs and scripts for Neo4j/Postgres/Redis; S3 bucket with lifecycle.

See:
- `production-deploy.md`
- `dr-runbook.md`
- `monitoring.md`
- `secrets.md`

