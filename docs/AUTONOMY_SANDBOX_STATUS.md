# Autonomy Sandbox Status

**Last Updated:** Sprint N+1
**Status:** Enforced

## Current Capabilities

The `ActionSandbox` implementation provides the following verifiable guarantees:

### 1. Resource Isolation

- **Memory**: Hard limit enforced via Docker `--memory` flag and secondary monitoring loop.
- **CPU**: Quota enforced via `--cpus`.
- **Time**: Execution time strictly bounded by `setTimeout` triggering `SIGKILL`.

### 2. Network Security

- **Default**: Isolated (`--network none`).
- **Guard**: `NetworkGuard` monitors socket connections (via `netstat`) for suspicious ports (22, 23, 3389, etc.) and metadata services (169.254.169.254).

### 3. Data Safety

- **Artifacts**: Input artifacts are written to a temporary, isolated directory.
- **Cleanup**: Sandbox directories and containers are removed after execution (using `--rm` and `fs.rm`).
- **Leak Prevention**: Standard output is scanned for credential patterns (API keys, tokens).

## Verified Limitations

- **Docker Dependency**: Requires Docker daemon availability.
- **Monitoring Latency**: Resource monitoring poll interval is 1s, allowing potential spikes between checks (mitigated by hard kernel limits).
- **Regex Filtering**: Secret detection is heuristic-based and not exhaustive.

## Verification

Run the compliance suite:
`npm test server/tests/autonomous/sandbox.test.ts`
