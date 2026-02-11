# Container Security Audit

## User Configuration
Verified that all production Dockerfiles enforce non-root users:
- Root Dockerfile: `USER node` (Chainguard hardened image)
- Server Dockerfile: `USER summit` (UID 1001)

## Immutability
- Production images use specific SHAs for base images.
- Chainguard images used in root Dockerfile provide minimal attack surface (no shell, no package manager).
- RO filesystem suggested for future enhancement.

## Findings
- Non-root user: **PASS**
- Hardened base images: **PASS**
- Immutability: **PASS** (pinned SHAs)

## Evidence
Verified via `Dockerfile` and `server/Dockerfile` at 2026-02-11T00:00:00Z.
