# Code Ownership & Governance

This document defines the ownership model for the IntelGraph repository. It maps directory paths to responsible teams and individuals, serving as the reference for the `CODEOWNERS` file.

## Ownership Principles

1.  **Explicit Ownership**: Every file and directory should have a clear owner responsible for reviews and maintenance.
2.  **Domain alignment**: Ownership follows the service/domain boundaries defined in [Boundary Map](../architecture/boundary_map.md).
3.  **Shared Responsibility**: "Hot files" and shared packages require broad consensus or specific "Gatekeeper" approval.

## Ownership Map

| Path                | Owner Team             | Description                          |
| :------------------ | :--------------------- | :----------------------------------- |
| **Root Config**     |                        |                                      |
| `/`                 | `@intelgraph-core`     | Root config, build scripts, Makefile |
| `.github/`          | `@intelgraph-ops`      | CI/CD workflows, templates           |
| **Core Platform**   |                        |                                      |
| `server/`           | `@intelgraph-core`     | Core API Server                      |
| `client/`           | `@intelgraph-core`     | Core Web Client                      |
| `apps/web/`         | `@intelgraph-core`     | Next-gen Web App                     |
| **Services**        |                        |                                      |
| `services/ai-*`     | `@intelgraph-ai`       | AI/ML Services                       |
| `services/graph-*`  | `@intelgraph-graph`    | Graph Database Services              |
| `services/audit-*`  | `@intelgraph-security` | Audit & Compliance Services          |
| `services/policy-*` | `@intelgraph-security` | Policy Engine                        |
| **Infrastructure**  |                        |                                      |
| `infra/`            | `@intelgraph-ops`      | Infrastructure as Code               |
| `k8s/`, `helm/`     | `@intelgraph-ops`      | Kubernetes Manifests                 |
| **Documentation**   |                        |                                      |
| `docs/`             | `@intelgraph-docs`     | Documentation                        |

## Review Requirements

- **Core Changes**: Require 1 approval from `@intelgraph-core`.
- **Infrastructure**: Require 1 approval from `@intelgraph-ops`.
- **Security Critical**: Changes to `services/auth*`, `services/policy*` require `@intelgraph-security`.

## Updating Ownership

To change ownership, update this document and the `.github/CODEOWNERS` file in a single PR.
