# Security Operations

- Image scanning: Trivy in CI (`.github/workflows/ci-cd.yml`, `security.yml`).
- Dependency scanning: Dependabot (`.github/dependabot.yml`), `npm audit` in `security.yml`.
- Runtime security: Falco via upstream chart (`helm/security`).
- Compliance baselines: CIS with kube-bench job (`k8s/security/kube-bench-job.yaml`).
- Policies: OPA Gatekeeper constraints (`k8s/policies/gatekeeper`).

Reporting:

- Trivy SARIF uploaded to GitHub Security tab.
- kube-bench JSON can be collected by a log pipeline.
