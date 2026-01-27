# Summit Error Code Reference

Quick reference for all error codes used in the Summit platform. For detailed troubleshooting, see [FAQ.md](./FAQ.md).

## Error Code Format

```
ERR-XXX: Category-specific error
```

| Range | Category |
|-------|----------|
| 001-009 | Environment Setup |
| 010-019 | Build Issues |
| 020-029 | Test Failures |
| 030-039 | Database Issues |
| 040-049 | Docker Issues |
| 050-059 | CI/CD Issues |
| 060-069 | Performance Issues |
| 070-079 | Authentication Issues |
| 080-089 | API Errors |
| 090-099 | Graph/Neo4j Errors |
| 100-109 | Security Errors |

---

## Environment Setup (001-009)

| Code | Error | Quick Fix |
|------|-------|-----------|
| ERR-001 | Node.js version mismatch | `nvm use 20.19.0` |
| ERR-002 | pnpm not found | `corepack enable && corepack prepare pnpm@10.0.0` |
| ERR-003 | Missing dependencies | `pnpm install --frozen-lockfile` |
| ERR-004 | Bootstrap script fails | `chmod +x scripts/*.sh` |
| ERR-005 | .env file missing | `cp .env.example .env` |
| ERR-006 | Environment variable not set | Check `.env` file |
| ERR-007 | Incompatible OS | Check platform requirements |
| ERR-008 | Insufficient disk space | Clean `node_modules`, Docker images |
| ERR-009 | Permission denied | Check file permissions |

## Build Issues (010-019)

| Code | Error | Quick Fix |
|------|-------|-----------|
| ERR-010 | TypeScript compilation errors | `tsc -b --clean && tsc -b` |
| ERR-011 | Build takes too long | Clear `.turbo` cache |
| ERR-012 | Out of memory | `NODE_OPTIONS="--max-old-space-size=8192"` |
| ERR-013 | Circular dependency | Check import structure |
| ERR-014 | Missing type definitions | Install `@types/*` package |
| ERR-015 | ESLint errors | `pnpm lint --fix` |
| ERR-016 | Prettier formatting | `pnpm format` |
| ERR-017 | Bundle size exceeded | Review imports, use code splitting |
| ERR-018 | Webpack/Vite config error | Check build config files |
| ERR-019 | Asset not found | Check public/static paths |

## Test Failures (020-029)

| Code | Error | Quick Fix |
|------|-------|-----------|
| ERR-020 | ES module error in Jest | Check `jest.config.cjs` preset |
| ERR-021 | Flaky tests | Add retries, check for timing issues |
| ERR-022 | Database connection refused | `make dev-up` |
| ERR-023 | Snapshot mismatch | `pnpm test -- -u` to update |
| ERR-024 | Mock not working | Check mock file location |
| ERR-025 | Coverage threshold not met | Add more tests |
| ERR-026 | E2E test timeout | Increase timeout, check selectors |
| ERR-027 | Test isolation failure | Check for shared state |
| ERR-028 | Fixture not found | Check test/fixtures path |
| ERR-029 | Playwright browser error | `npx playwright install` |

## Database Issues (030-039)

| Code | Error | Quick Fix |
|------|-------|-----------|
| ERR-030 | PostgreSQL connection failed | Check Docker, `DATABASE_URL` |
| ERR-031 | Neo4j connection failed | Check Docker, credentials |
| ERR-032 | Migration failed | `pnpm db:knex:rollback` |
| ERR-033 | Seed data error | Check seed file syntax |
| ERR-034 | Duplicate key violation | Clear data or use upsert |
| ERR-035 | Transaction deadlock | Review query patterns |
| ERR-036 | Connection pool exhausted | Increase pool size |
| ERR-037 | Redis connection failed | Check Redis container |
| ERR-038 | Schema mismatch | Run migrations |
| ERR-039 | Database locked | Kill long-running queries |

## Docker Issues (040-049)

| Code | Error | Quick Fix |
|------|-------|-----------|
| ERR-040 | Docker daemon not running | Start Docker Desktop |
| ERR-041 | Port already in use | `lsof -i :<port>` then kill |
| ERR-042 | No disk space | `docker system prune -a` |
| ERR-043 | Image not found | `docker pull <image>` |
| ERR-044 | Container restart loop | Check logs: `docker logs <container>` |
| ERR-045 | Network error | `docker network prune` |
| ERR-046 | Volume mount failed | Check path permissions |
| ERR-047 | Docker Compose syntax | Validate with `docker-compose config` |
| ERR-048 | Resource limits | Increase Docker resource allocation |
| ERR-049 | Build context too large | Add to `.dockerignore` |

## CI/CD Issues (050-059)

| Code | Error | Quick Fix |
|------|-------|-----------|
| ERR-050 | Fork PR permissions | Expected for security; merge via maintainer |
| ERR-051 | Coverage gate failed | Increase test coverage |
| ERR-052 | Pre-commit hook failed | `pnpm lint --fix && pnpm format` |
| ERR-053 | Workflow syntax error | Validate YAML |
| ERR-054 | Secret not found | Check repository secrets |
| ERR-055 | Artifact upload failed | Check file paths |
| ERR-056 | Timeout exceeded | Optimize or increase timeout |
| ERR-057 | Concurrency conflict | Wait for other workflow |
| ERR-058 | Release failed | Check release-ga.yml logs |
| ERR-059 | Deployment failed | Check environment config |

## Performance Issues (060-069)

| Code | Error | Quick Fix |
|------|-------|-----------|
| ERR-060 | Slow server startup | Use minimal Docker profile |
| ERR-061 | High memory usage | Limit Docker, reduce concurrency |
| ERR-062 | Slow queries | Add indexes, check query plan |
| ERR-063 | API response timeout | Check backend logs |
| ERR-064 | Large bundle size | Code splitting, lazy loading |
| ERR-065 | Memory leak | Profile with Node inspector |
| ERR-066 | CPU spike | Check for infinite loops |
| ERR-067 | Network latency | Check DNS, use local services |
| ERR-068 | Cache miss | Review caching strategy |
| ERR-069 | Rate limiting | Implement backoff |

## Authentication Issues (070-079)

| Code | Error | Quick Fix |
|------|-------|-----------|
| ERR-070 | JWT invalid | Check `JWT_SECRET` consistency |
| ERR-071 | OAuth callback mismatch | Update OAuth provider config |
| ERR-072 | Session expired | Re-authenticate |
| ERR-073 | CORS error | Check allowed origins |
| ERR-074 | CSRF token invalid | Refresh page, check token |
| ERR-075 | Permission denied | Check user roles |
| ERR-076 | API key invalid | Regenerate API key |
| ERR-077 | MFA required | Complete MFA challenge |
| ERR-078 | Account locked | Contact admin |
| ERR-079 | SSO configuration error | Check SAML/OIDC config |

## API Errors (080-089)

| Code | Error | Quick Fix |
|------|-------|-----------|
| ERR-080 | 400 Bad Request | Check request payload |
| ERR-081 | 401 Unauthorized | Check authentication |
| ERR-082 | 403 Forbidden | Check permissions |
| ERR-083 | 404 Not Found | Check endpoint URL |
| ERR-084 | 409 Conflict | Resolve resource conflict |
| ERR-085 | 422 Validation Error | Check input validation |
| ERR-086 | 429 Rate Limited | Implement backoff |
| ERR-087 | 500 Internal Error | Check server logs |
| ERR-088 | 502 Bad Gateway | Check upstream service |
| ERR-089 | 503 Service Unavailable | Wait and retry |

## Graph/Neo4j Errors (090-099)

| Code | Error | Quick Fix |
|------|-------|-----------|
| ERR-090 | Cypher syntax error | Validate query syntax |
| ERR-091 | Node not found | Check node ID/labels |
| ERR-092 | Relationship error | Check relationship type |
| ERR-093 | Constraint violation | Check unique constraints |
| ERR-094 | Index not found | Create required index |
| ERR-095 | Graph traversal timeout | Limit traversal depth |
| ERR-096 | APOC procedure error | Check APOC installation |
| ERR-097 | Bolt protocol error | Check Neo4j version |
| ERR-098 | Transaction error | Review transaction scope |
| ERR-099 | Graph memory error | Increase Neo4j heap |

## Security Errors (100-109)

| Code | Error | Quick Fix |
|------|-------|-----------|
| ERR-100 | Secrets detected | Remove secrets, use env vars |
| ERR-101 | Vulnerability found | Update vulnerable package |
| ERR-102 | Policy violation | Review OPA policy |
| ERR-103 | Audit log failure | Check audit service |
| ERR-104 | Encryption error | Check encryption keys |
| ERR-105 | Certificate error | Update/renew certificates |
| ERR-106 | IP blocked | Check firewall rules |
| ERR-107 | DLP violation | Review data handling |
| ERR-108 | Compliance error | Review compliance config |
| ERR-109 | Security scan failed | Fix identified issues |

---

## Reporting New Errors

When encountering an unclassified error:

1. Check if a similar error exists in this reference
2. If new, document with:
   - Error code (next available in category)
   - Error message
   - Root cause
   - Quick fix
   - Detailed resolution (if complex)

Submit documentation updates via PR to `docs/troubleshooting/`.

---

*Last updated: 2026-01-27*
