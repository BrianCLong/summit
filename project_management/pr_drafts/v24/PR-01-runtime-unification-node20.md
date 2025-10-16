# PR 1 — Runtime Unification (Docker sweep, part 1)

Title: feat(runtime): unify base images to Node20 & Python3.12 (apps+clients)

Why: Reduce CVEs, standardize toolchains, speed builds.

Scope (this PR): apps/_, client/_, conductor-ui/_, copilot/_, cognitive-insights/infra/\*

Changes:

- Bump FROM node:18-alpine → node:20-alpine
- Normalize node:${NODE_VERSION}-alpine → lock to node:20-alpine
- Keep distroless/chainguard images as‑is for now.

Files (examples):

- apps/mobile-interface/Dockerfile
- apps/search-engine/Dockerfile
- client/Dockerfile.dev, client/Dockerfile.prod
- conductor-ui/Dockerfile.dev
- copilot/Dockerfile

Patch (batchable via sed):

```bash
# Run from repo root
rg -l "^FROM\s+node:18" -n --glob "apps/**|client/**|conductor-ui/**|copilot/**|cognitive-insights/**" | while read f; do
  gsed -i 's/^FROM\s\+node:18-alpine/FROM node:20-alpine/' "$f"
done
rg -l "^FROM\s+node:\${NODE_VERSION}-alpine" -n --glob "apps/**|client/**" | while read f; do
  gsed -i 's/^FROM\s\+node:\${NODE_VERSION}-alpine/FROM node:20-alpine/' "$f"
done
```

Test plan: build images + run unit/contract; scan with Trivy (HIGH/CRIT=0).

Canary/rollback: ship via 10% weight; monitor p95 & error‑rate; abort on breach.

Checklist: SBOM attached · cosign signed · CHANGELOG updated.

---

Shared: See SHARED-SECTIONS.md for risk, evidence, and operator commands.
