# API Determinism Check

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

## Overview

The API Determinism Check verifies that API endpoints return consistent, predictable responses. Non-deterministic APIs can cause hard-to-debug issues, test flakiness, and cache invalidation problems.

### Key Properties

- **Multiple iterations**: Calls each endpoint multiple times
- **Response comparison**: Normalizes and compares responses
- **Ignored fields**: Excludes expected-variable fields (timestamps, etc.)
- **Automatic reporting**: Generates detailed reports
- **Release blocking**: Fails release if determinism violated

---

## Why Determinism Matters

| Issue                | Impact                                        |
| -------------------- | --------------------------------------------- |
| Flaky tests          | Tests fail intermittently, eroding confidence |
| Cache problems       | Responses can't be reliably cached            |
| Debugging difficulty | Hard to reproduce issues                      |
| Client confusion     | Same request returns different data           |

---

## How It Works

1. **Call endpoint** multiple times (default: 3)
2. **Normalize responses** by removing expected-variable fields
3. **Compare all responses** to the first (baseline)
4. **Report** any unexpected differences

```
Request 1 → Response A (baseline)
Request 2 → Response B
Request 3 → Response C

Compare: A == B == C → PASS
         A != B      → FAIL
```

---

## Checked Endpoints

| Endpoint                   | Method | Expected      |
| -------------------------- | ------ | ------------- |
| `/health`                  | GET    | Deterministic |
| `/api/v1/status`           | GET    | Deterministic |
| `/api/version`             | GET    | Deterministic |
| `/graphql` (introspection) | POST   | Deterministic |

---

## Ignored Fields

These fields are expected to vary and are excluded from comparison:

| Field           | Reason              |
| --------------- | ------------------- |
| `timestamp`     | Server time         |
| `created_at`    | Creation timestamp  |
| `updated_at`    | Update timestamp    |
| `serverTime`    | Current server time |
| `requestId`     | Unique per request  |
| `traceId`       | Distributed tracing |
| `correlationId` | Request correlation |
| `uptime`        | Server uptime       |
| `memory`        | Memory usage        |
| `cpu`           | CPU usage           |
| `nonce`         | Security nonce      |

---

## Usage

### Via GitHub Actions UI

1. Navigate to Actions -> API Determinism Check
2. Click "Run workflow"
3. Configure options:
   - `base_url`: Server URL to check
   - `iterations`: Number of calls per endpoint
   - `strict`: Fail on any variance
4. Click "Run workflow"

### Via CLI

```bash
# Check localhost with defaults
./scripts/release/api_determinism_check.sh

# Check specific URL
./scripts/release/api_determinism_check.sh --base-url https://staging.example.com

# Increase iterations
./scripts/release/api_determinism_check.sh --iterations 5

# Check specific endpoint
./scripts/release/api_determinism_check.sh --endpoint /api/users

# Strict mode (no ignored fields)
./scripts/release/api_determinism_check.sh --strict

# Generate report only
./scripts/release/api_determinism_check.sh --report
```

---

## Configuration

### Policy File

Configure in `docs/ci/API_DETERMINISM_POLICY.yml`:

```yaml
check:
  # Number of iterations per endpoint
  iterations: 3

  # Delay between iterations (ms)
  iteration_delay: 100

endpoints:
  - path: "/api/custom"
    method: GET
    deterministic: true
    ignore_fields:
      - "customTimestamp"

allowed_variance_fields:
  - "timestamp"
  - "requestId"
```

### Adding Endpoints

```yaml
endpoints:
  - path: "/api/new-endpoint"
    method: POST
    body: '{"param":"value"}'
    content_type: "application/json"
    deterministic: true
```

---

## Workflow Triggers

| Trigger    | Condition         | Action              |
| ---------- | ----------------- | ------------------- |
| Schedule   | Daily 8 AM UTC    | Check all endpoints |
| Manual     | Workflow dispatch | Configurable        |
| Deployment | After deploy      | Verify staging/prod |

---

## Common Causes of Non-Determinism

### 1. Random Values

```typescript
// ❌ Non-deterministic
function getResponse() {
  return {
    id: Math.random(),
    data: "value",
  };
}

// ✅ Deterministic
function getResponse() {
  return {
    id: "fixed-id",
    data: "value",
  };
}
```

### 2. Unordered Collections

```typescript
// ❌ Non-deterministic (Set iteration order not guaranteed)
function getUsers() {
  return Array.from(userSet);
}

// ✅ Deterministic
function getUsers() {
  return Array.from(userSet).sort((a, b) => a.id.localeCompare(b.id));
}
```

### 3. Object Key Order

```typescript
// ❌ Non-deterministic in some engines
const obj = {};
obj.b = 1;
obj.a = 2;

// ✅ Deterministic
const obj = { a: 2, b: 1 }; // Consistent order
```

### 4. Timestamp Inclusion

```typescript
// ❌ Non-deterministic (includes current time)
function getStatus() {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
  };
}

// ✅ Add timestamp to ignore list or exclude from response
```

---

## Fixing Non-Determinism

### Sort Arrays

```typescript
// Before returning, sort arrays by a stable key
response.items = response.items.sort((a, b) => a.id.localeCompare(b.id));
```

### Use Stable IDs

```typescript
// Use deterministic ID generation
import { createHash } from "crypto";

function stableId(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}
```

### Exclude Non-Deterministic Fields

```typescript
// Return only deterministic fields
function getPublicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    // Don't include: lastLogin, sessionId, etc.
  };
}
```

---

## State Tracking

State in `docs/releases/_state/determinism_state.json`:

```json
{
  "version": "1.0.0",
  "last_check": "2026-01-08T08:00:00Z",
  "last_result": {
    "total": 4,
    "passed": 4,
    "failed": 0,
    "status": "passed",
    "base_url": "http://localhost:3000"
  },
  "check_history": [...]
}
```

---

## Integration

### With Release Gates

```yaml
- name: Check Determinism
  run: |
    STATUS=$(jq -r '.last_result.status' docs/releases/_state/determinism_state.json)
    if [[ "$STATUS" == "failed" ]]; then
      echo "Release blocked: API determinism check failed"
      exit 1
    fi
```

### With Deployment

```yaml
# In deployment workflow
deploy:
  steps:
    - name: Deploy
      run: ./deploy.sh

    - name: Verify Determinism
      uses: ./.github/workflows/api-determinism-check.yml
      with:
        base_url: https://staging.example.com
```

---

## Troubleshooting

### Server Unavailable

**Symptom:** Check skipped due to server unavailable

**Resolution:**

1. Ensure server starts before check
2. Check port configuration
3. Review server startup logs

### False Positives

**Symptom:** Check fails but responses look the same

**Resolution:**

1. Enable strict mode to see exact diff
2. Check for hidden characters or encoding
3. Review JSON normalization logic

### Missing Endpoint

**Symptom:** Endpoint not checked

**Resolution:**

1. Add endpoint to policy file
2. Ensure endpoint path is correct
3. Check method (GET vs POST)

---

## Best Practices

1. **Design for determinism**: Consider determinism during API design
2. **Sort collections**: Always sort arrays before returning
3. **Exclude timestamps**: Use ignore list for time-based fields
4. **Test locally**: Run check before pushing changes
5. **Monitor trends**: Review check history for patterns

---

## References

- [Release Ops Index](RELEASE_OPS_INDEX.md)
- [GA Hard Gates](ga-hard-gates.md)
- [API Design Guidelines](../api/DESIGN_GUIDELINES.md)

---

## Change Log

| Date       | Change                        | Author               |
| ---------- | ----------------------------- | -------------------- |
| 2026-01-08 | Initial API Determinism Check | Platform Engineering |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
