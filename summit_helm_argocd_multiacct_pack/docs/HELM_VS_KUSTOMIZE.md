# Helm vs. Kustomize

- **Helm**: package params, versioned releases, templating, values files per env, easy to publish.
- **Kustomize**: patch‑first overlays, good for GitOps diffs and small mutations.
  Use Helm for the core app; use ArgoCD Applications pointed at the Helm chart with per‑env values.
