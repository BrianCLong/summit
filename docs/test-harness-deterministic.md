# Deterministic Test Runtime Gate

## Control

The server test suite has been made deterministic and is now a CI-blocking gate that prevents merges when tests fail.

## Evidence

### Command(s)

- `cd server && npm test`
- GitHub Actions workflow: `.github/workflows/intelgraph-ci.yml`

### Paths

#### Key modules touched:

- `/server/src/metrics/registry.ts` - Fixed prom-client registry persistence
- `/server/tests/setup/jest.setup.cjs` - Network ban and registry reset
- `/server/tests/deterministic-test-harness.test.ts` - Regression tests
- `.github/workflows/intelgraph-ci.yml` - CI enforcement

#### Test isolation rules implemented:

- No registration-on-import for metrics: Metrics registry is now created per-test instead of globally
- No network in tests: Network connections and DNS lookups are blocked during tests
- Services disposal: All services properly started/stopped in test lifecycle hooks

## Implementation Details

### 1. Prom-client Registry Isolation

- Created `resetRegistry()` function to clear metrics between tests
- Changed from global registry to per-test instance creation
- Added registry reset to Jest setup/teardown hooks

### 2. Network Connection Prevention

- Blocked `net.connect` calls to prevent TCP connections
- Blocked `dns.lookup` to prevent hostname resolution
- Mocked both `ioredis` and `redis` packages to prevent real connections
- Added Redis mock with proper client lifecycle methods

### 3. Open Handles Resolution

- Ensured all timers and intervals are properly cleaned up
- Added afterEach/afterAll cleanup in Jest setup
- Prevented services from starting at import time

### 4. CI Enforcement

- Updated `.github/workflows/intelgraph-ci.yml` to run server tests as blocking
- Tests now run on PRs that modify server code
- Failing tests will block merges
