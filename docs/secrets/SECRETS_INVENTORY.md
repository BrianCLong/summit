# Secrets Surface Inventory

**Status:** GA Baseline
**Owner:** Jules (Secrets Lifecycle Owner)
**Last Updated:** MVP4 GA

This document enumerates all secret types authorized for use in the Summit MVP4 GA release. Any secret type not listed here is **unauthorized**.

## 1. Application Runtime Secrets

These secrets are injected into the application environment at runtime.

| Category | Secret Variable | Purpose | Location in Code | Storage Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **Database** | `DATABASE_URL` | PostgreSQL connection string (contains password) | `server/src/config/secrets.ts` | Env Var / K8s Secret |
| **Database** | `NEO4J_PASSWORD` | Authentication for Neo4j Graph DB | `server/src/config/secrets.ts` | Env Var / K8s Secret |
| **Database** | `REDIS_PASSWORD` | Authentication for Redis Cache | `server/src/config/secrets.ts` | Env Var / K8s Secret |
| **Auth** | `JWT_SECRET` | Signing user access tokens | `server/src/config/secrets.ts` | Env Var / K8s Secret |
| **Auth** | `JWT_REFRESH_SECRET` | Signing long-lived refresh tokens | `server/src/config/secrets.ts` | Env Var / K8s Secret |
| **Auth** | `SESSION_SECRET` | Signing session cookies | `server/src/config/secrets.ts` | Env Var / K8s Secret |
| **Auth** | `OIDC_CLIENT_SECRET` | OIDC Identity Provider authentication | `server/src/config/secrets.ts` | Env Var / K8s Secret |
| **Security** | `ENCRYPTION_KEY` | Application-level field encryption | `server/src/config/secrets.ts` | Env Var / K8s Secret |
| **Security** | `TLS_KEY_PATH` | Path to TLS Private Key file | `server/src/config/secrets.ts` | Volume Mount (Secret) |
| **Integration** | `OPENAI_API_KEY` | LLM Provider Access (Copilot) | `server/src/config/secrets.ts` | Env Var / K8s Secret |
| **Integration** | `VIRUSTOTAL_API_KEY` | Threat Intelligence Integration | `server/src/config/secrets.ts` | Env Var / K8s Secret |

## 2. CI/CD & Infrastructure Secrets

These secrets are used by GitHub Actions workflows for build, test, and deployment.

| Secret Name | Purpose | Usage Reference | Storage Mechanism |
| :--- | :--- | :--- | :--- |
| `GITHUB_TOKEN` | Repository access, PR automation, Releases | `.github/workflows/*.yml` | GitHub Secrets (Auto) |
| `SNYK_TOKEN` | Security vulnerability scanning | `.github/workflows/ci-security.yml` | GitHub Secrets |
| `CODECOV_TOKEN` | Test coverage reporting | `.github/workflows/_reusable-test.yml` | GitHub Secrets |
| `AWS_ACCESS_KEY_ID` | Infrastructure Provisioning / S3 Access | `.github/workflows/_reusable-aws.yml` | GitHub Secrets |
| `AWS_SECRET_ACCESS_KEY` | Infrastructure Provisioning / S3 Access | `.github/workflows/_reusable-aws.yml` | GitHub Secrets |
| `SLACK_WEBHOOK_URL` | Ops notifications | `.github/workflows/reusable/notifications.yml` | GitHub Secrets |

## 3. Non-Goals

The following are **explicitly out of scope** for this inventory:

*   **User Passwords:** Hashed and salted in the database; not considered "secrets" in this context.
*   **Ephemeral Test Secrets:** Randomly generated during test execution (see `server/src/config/secrets.ts:generateSecrets`).
*   **Local Development Secrets:** Managed via `.env` files (gitignored) or `docker-compose` overrides, using documented default/weak values for non-prod environments.

## 4. Evidence & Validation

*   **Schema Definition:** `server/src/config/secrets.ts` (Zod schema enforces presence/format).
*   **Production Validation:** `validateProductionSecurity` function ensures no default/weak secrets in `NODE_ENV=production`.
*   **Exclusion Check:** `scripts/security/detect_secrets.cjs` ensures no values are hardcoded in the repo.
