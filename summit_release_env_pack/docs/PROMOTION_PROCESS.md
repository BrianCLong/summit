# Promotion Process (dev → staging → prod)

- Build on `main` pushes and publish to ECR.
- Use the `Promote between environments` workflow (workflow_dispatch) with the image SHA.
- `environment:` gates approvals (reviewers) for staging/prod.
- Kustomize overlays pin the target image tag/digest per environment.
