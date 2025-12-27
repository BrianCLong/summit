# Release Cadence & Versioning

## Overview

Summit follows a rigorous, sprint-based release cycle to ensure stability, security, and velocity. Our release process is automated by our "Release Captain" (Jules) and governed by strict quality gates.

## Sprint Cycle

We operate on a **2-week sprint cadence**.

- **Current Cycle**: Q4 2025 Strategic Sprints (Sprint 25+)
- **Sprint Goals**: Defined in `docs/roadmap.md` and `backlog.yaml`.

### Typical Sprint Schedule

1.  **Planning**: Scope defined from the Backlog.
2.  **Development**: Features implemented on `feat/*` branches.
3.  **Merge Train**: PRs validated via CI and merged to `main`.
4.  **Code Freeze**: 48 hours before release.
5.  **Release**: Tagged release (`vX.Y.Z`) deployed to production.

## Versioning Strategy

We adhere to [Semantic Versioning (SemVer) 2.0.0](https://semver.org/):

- **Major (`X.0.0`)**: Breaking changes (e.g., API schema changes, removal of deprecated features).
- **Minor (`0.Y.0`)**: New features (backward compatible).
- **Patch (`0.0.Z`)**: Bug fixes and security patches.

**Note**: During pre-v1.0 development, minor version bumps may include breaking changes, though we strive to minimize them.

## The Release Captain (Jules)

Our release process is automated by **Jules**, an AI agent responsible for:

- **Managing the Merge Train**: ensuring PRs are merged sequentially and safely.
- **Generating Changelogs**: Aggregating Conventional Commits into readable release notes.
- **Tagging Releases**: Creating Git tags and GitHub Releases.
- **Artifact Publication**: Pushing Docker images and Helm charts.

## CI/CD Pipeline

Our "Fast Lane" CI/CD pipeline ensures rapid feedback:

1.  **Commit**: Developer pushes code.
2.  **Fast Lane**: Lint, Typecheck, Unit Tests run immediately.
3.  **Golden Path**: Full-stack integration test (`make smoke`) runs on a fresh environment.
4.  **Security Gate**: SAST, DAST, and Secret Scanning.
5.  **Merge**: If all green, code merges to `main`.
6.  **Deploy**: `main` is automatically deployed to the staging environment.

## Hotfixes

Critical security fixes or production bugs are handled via `hotfix/*` branches, which bypass the normal sprint cadence but must still pass the **Golden Path** CI gate.
