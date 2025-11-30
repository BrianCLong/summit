## 🚀 Release ${tag}

**Artifact**: ghcr.io/BrianCLong/summit@${digest}
**SBOM**: attached (spdx)

### Highlights
- <user-visible changes>

### Risk & Rollback
- Canary steps: 10%/50%/100% with SLO guard
- Rollback: `gh workflow run Deploy-to-Prod -f image=${prev}`

### Ops
- Migrations: <gated?>
- Flags default: <list>
