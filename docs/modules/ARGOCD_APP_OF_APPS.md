# ArgoCD App‑of‑Apps

- Apply `project.yaml` then `root-application.yaml` in the argocd namespace.
- `argocd/apps/*.yaml` define per‑environment Applications sourcing the chart at `helm/summit`.
- Protect staging/prod with ArgoCD RBAC and GitHub environment approvals.
