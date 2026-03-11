# Environment Variables Reference

This document outlines the required and optional environment variables for deploying Summit in production.

## Core Services

### Database & Caching
| Variable | Description | Example/Format |
|----------|-------------|----------------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db_name` |
| `REDIS_URL` | Redis connection string | `redis://:pass@host:6379/0` |
| `NEO4J_URI` | Neo4j connection string | `bolt://host:7687` |
| `NEO4J_USER` | Neo4j authentication user | `neo4j` |
| `NEO4J_PASSWORD` | Neo4j authentication password | `secret_password` |

### Authentication & Security
| Variable | Description | Example/Format |
|----------|-------------|----------------|
| `OIDC_ISSUER` | OIDC Provider Issuer URL | `https://example.okta.com` |
| `OIDC_CLIENT_ID` | Application client ID | `alphanumeric_string` |
| `OIDC_CLIENT_SECRET` | Application client secret | `alphanumeric_string` |
| `SESSION_SECRET` | Secret for sessions | `min_32_chars_random` |
| `JWT_SECRET` | Secret for JWTs | `min_32_chars_random` |
| `JWT_REFRESH_SECRET` | Secret for JWT refreshes | `min_32_chars_random` |
| `CORS_ORIGIN` | Allowed CORS origins | `https://app.summit.ai,https://api.summit.ai` |

### Integrations
| Variable | Description | Example/Format |
|----------|-------------|----------------|
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `ANTHROPIC_API_KEY` | Anthropic API key | `sk-ant-...` |
| `LINEAR_API_KEY` | Linear API key | `lin_api_...` |
| `NOTION_API_KEY` | Notion API key | `ntn_...` |
| `ATLASSIAN_API_TOKEN` | Atlassian API token | `alphanumeric_string` |

### API Gateway & Routing
| Variable | Description | Example/Format |
|----------|-------------|----------------|
| `PORT` | API Gateway listening port | `4000` |
| `NODE_ENV` | Environment identifier | `production` |
| `CONFIG_VALIDATE_ON_START` | Strict config validation (should be `true` in prod) | `true` |
| `HEALTH_ENDPOINTS_ENABLED` | Enable `/healthz` and `/readyz` | `true` |

### Actuation Control (Entropy)
| Variable | Description | Example/Format |
|----------|-------------|----------------|
| `ENTROPY_ACTUATION_ENABLED` | Master kill-switch for ALL entropy actuation | `false` |
| `DRY_RUN` | All actions are simulated | `true` |
| `ENTROPY_AUDIT_LOG` | Audit log enabled (REQUIRED for production) | `true` |

## Security Considerations
* **Never commit actual values** to version control.
* Use a robust secrets manager (e.g., AWS Secrets Manager, HashiCorp Vault, Kubernetes Secrets) in production.
* Minimum length for secret keys (like `JWT_SECRET`) is 32 random characters.
