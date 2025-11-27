### Creating a new CompanyOS service (golden path)

From repo root:

```bash
pnpm companyos:new-service --name companyos-foo --owner "team-foo" --port 4201 --tier normal
```

Use kebab-case service names (e.g., `companyos-foo`) so generated manifests, Prometheus labels, and package names stay consistent.

This will:

* Create `companyos/services/companyos-foo` with a Node/Express skeleton.
* Create `companyos/services/companyos-foo/service.yaml`.
* Add `companyos/services/companyos-foo/tests/README.md` with starter testing guidance.
* Generate SLO + Prometheus rules under `observability/.../generated`.
* Add `.github/workflows/companyos-foo.yml` calling the standard deployment template.
* Add an ADR stub under `companyos/adr/`.

**Next steps for the team:**

1. Copy `package.json`/`tsconfig` from `companyos-api` and adjust names.
2. Implement real routes/handlers.
3. Create a Helm chart at `charts/companyos-foo` (or copy from `companyos-api`).
4. Wire any OPA / Identity / step-up rules specific to this service.
