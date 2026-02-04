# Batch 2 Implementation: High-Severity Go & npm Vulnerabilities

**Status:** PLANNED  
**Timeline:** Weeks 2-3  
**Priority:** HIGH  
**Estimated Effort:** 30-40 hours

## Overview

Batch 2 addresses high-severity vulnerabilities in the Go standard library and npm core dependencies that could enable significant security breaches.

## Task 2.1: Upgrade Go Modules to 1.24.5+

### Context

**CVE-2025-4674:** Unexpected command execution vulnerability in Go versions prior to 1.24.5

### Current Status

**Go Modules Identified:** 44 total

**Current Versions:**
- Go 1.21 (3 modules)
- Go 1.22 (2 modules)
- Go 1.24.3 (39 modules)

### Required Changes

All `go.mod` files must specify Go 1.24.5 or later:

```go
go 1.24.5
```

### Affected Modules

| Module | Current Version | Target Version | Priority |
|--------|-----------------|-----------------|----------|
| github.com/summit/alsp | 1.22 | 1.24.5 | HIGH |
| github.com/summit/ccs | 1.24.3 | 1.24.5 | HIGH |
| github.com/summit/cea | 1.21 | 1.24.5 | CRITICAL |
| drst | 1.24.3 | 1.24.5 | HIGH |
| ccc/consentguard | 1.21 | 1.24.5 | CRITICAL |

### Implementation Steps

1. **Identify all go.mod files:**
   ```bash
   find . -name "go.mod" -type f | sort
   ```

2. **Update each go.mod file:**
   ```bash
   # For each module directory
   cd <module-directory>
   go mod edit -go=1.24.5
   go mod tidy
   cd -
   ```

3. **Verify updates:**
   ```bash
   grep "^go " go.mod
   ```

4. **Run tests:**
   ```bash
   go test ./...
   govulncheck ./...
   ```

### Testing

- [ ] All go.mod files updated to 1.24.5
- [ ] `go mod tidy` passes for all modules
- [ ] `go test ./...` passes for all modules
- [ ] `govulncheck ./...` shows no vulnerabilities
- [ ] No breaking changes to Go code

### Success Criteria

- All 44 Go modules upgraded to 1.24.5+
- All tests pass
- No functionality regressions

---

## Task 2.2: Update containerd Dependency

### Context

**GO-2025-3528:** Integer overflow in User ID handling in containerd

### Current Status

**Affected Package:** github.com/containerd/containerd

**Required Action:** Update to patched version

### Implementation Steps

1. **Identify containerd usage:**
   ```bash
   grep -r "containerd" go.mod
   ```

2. **Update containerd:**
   ```bash
   go get -u github.com/containerd/containerd@latest
   go mod tidy
   ```

3. **Verify update:**
   ```bash
   go mod graph | grep containerd
   ```

4. **Run tests:**
   ```bash
   go test ./...
   govulncheck ./...
   ```

### Testing

- [ ] containerd updated to patched version
- [ ] All tests pass
- [ ] No breaking changes

### Success Criteria

- containerd integer overflow vulnerability resolved
- All tests pass
- No functionality regressions

---

## Task 2.3: Update npm Core Dependencies

### Context

High-severity vulnerabilities in critical npm dependencies used throughout the monorepo.

### Current Versions

| Package | Current | Target | Reason |
|---------|---------|--------|--------|
| apollo-server-express | 3.13.0 | 3.13.1+ | Security advisories |
| neo4j-driver | 5.28.1 | 5.29.0+ | Database security |
| pg | 8.16.3 | 8.17.0+ | PostgreSQL security |
| redis | 5.8.1 | 5.9.0+ | Redis client security |

### Implementation Steps

1. **Update each dependency:**
   ```bash
   npm update apollo-server-express
   npm update neo4j-driver
   npm update pg
   npm update redis
   ```

2. **Or use pnpm:**
   ```bash
   pnpm update apollo-server-express neo4j-driver pg redis
   ```

3. **Verify updates:**
   ```bash
   npm list apollo-server-express neo4j-driver pg redis
   ```

4. **Run tests:**
   ```bash
   npm run test
   npm run test:integration
   ```

### Testing

- [ ] All dependencies updated
- [ ] npm audit passes
- [ ] All tests pass
- [ ] Database connections work
- [ ] GraphQL server functions correctly
- [ ] Redis operations work

### Success Criteria

- All npm core dependencies updated
- All tests pass
- Database connections verified
- No functionality regressions

---

## Task 2.4: Database Connection Testing

### Context

Verify that database-related updates don't break connections or functionality.

### Test Cases

#### PostgreSQL (pg)

```javascript
// Test connection
const { Client } = require('pg');
const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

await client.connect();
const result = await client.query('SELECT NOW()');
console.log('Connection successful:', result.rows[0]);
await client.end();
```

#### Neo4j (neo4j-driver)

```javascript
// Test connection
const neo4j = require('neo4j-driver');
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

const session = driver.session();
const result = await session.run('RETURN "Connection successful" as message');
console.log(result.records[0].get('message'));
await session.close();
await driver.close();
```

#### Redis (redis)

```javascript
// Test connection
const redis = require('redis');
const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

await client.connect();
const pong = await client.ping();
console.log('Redis connection successful:', pong);
await client.disconnect();
```

### Testing

- [ ] PostgreSQL connection test passes
- [ ] Neo4j connection test passes
- [ ] Redis connection test passes
- [ ] All integration tests pass
- [ ] No connection timeouts
- [ ] No authentication errors

### Success Criteria

- All database connections work correctly
- No connection errors or timeouts
- All integration tests pass

---

## Pull Requests to Create

### PR 2a: Upgrade Go Modules to 1.24.5

**Title:** `security(batch-2a): upgrade all Go modules to 1.24.5 and patch containerd`

**Description:**
- Upgrades all 44 Go modules to Go 1.24.5 to fix CVE-2025-4674
- Updates containerd to resolve GO-2025-3528
- Includes comprehensive testing

**Files Changed:**
- All `go.mod` files (44 total)
- Related `go.sum` files

**Tests:**
- `go test ./...` passes for all modules
- `govulncheck ./...` shows no vulnerabilities
- No breaking changes

### PR 2b: Update npm Core Dependencies

**Title:** `security(batch-2b): update npm core dependencies (apollo, neo4j, pg, redis)`

**Description:**
- Updates apollo-server-express to 3.13.1+
- Updates neo4j-driver to 5.29.0+
- Updates pg to 8.17.0+
- Updates redis to 5.9.0+
- Includes database connection verification

**Files Changed:**
- package.json
- package-lock.json (if applicable)
- pnpm-lock.yaml

**Tests:**
- npm audit passes
- All unit tests pass
- Database connection tests pass
- Integration tests pass

---

## Implementation Checklist

### Phase 1: Go Module Upgrades
- [ ] Identify all go.mod files
- [ ] Update each to Go 1.24.5
- [ ] Run `go mod tidy` for all modules
- [ ] Run tests for all modules
- [ ] Create PR 2a

### Phase 2: containerd Update
- [ ] Update containerd dependency
- [ ] Verify update
- [ ] Run tests
- [ ] Merge into PR 2a

### Phase 3: npm Dependency Updates
- [ ] Update apollo-server-express
- [ ] Update neo4j-driver
- [ ] Update pg
- [ ] Update redis
- [ ] Run full test suite
- [ ] Create PR 2b

### Phase 4: Database Testing
- [ ] Test PostgreSQL connections
- [ ] Test Neo4j connections
- [ ] Test Redis connections
- [ ] Run integration tests
- [ ] Verify no regressions

## Success Criteria

- [ ] All 44 Go modules upgraded to 1.24.5+
- [ ] containerd integer overflow vulnerability resolved
- [ ] All npm core dependencies updated
- [ ] All tests pass
- [ ] Database connections verified
- [ ] No functionality regressions
- [ ] All PRs pass CI checks
- [ ] Code review completed

## Risk Assessment

### Risks

1. **Breaking Changes:** Go 1.24.5 may introduce breaking changes
2. **Dependency Conflicts:** npm updates may cause conflicts
3. **Database Compatibility:** New versions may not be compatible with existing schemas

### Mitigation

1. Run full test suite before merging
2. Test with actual database instances
3. Have rollback plan ready
4. Monitor for issues post-merge

## Timeline

| Week | Task | Status |
|------|------|--------|
| 2 | Go module upgrades | Not Started |
| 2 | containerd update | Not Started |
| 2-3 | npm dependency updates | Not Started |
| 3 | Database testing | Not Started |
| 3 | PR review and merge | Not Started |

---

**Document Version:** 1.0  
**Last Updated:** January 14, 2026  
**Prepared by:** Manus AI Security Implementation
