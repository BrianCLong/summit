# Demo Mode

This document describes the **Demo Mode** functionality and its security controls.

## Overview

Demo Mode is a special runtime state intended for guided tours, sales demos, and "reset-able" environments. It enables specific endpoints (e.g., seeding, resetting) that are otherwise dangerous or irrelevant in production.

## Hard Gate

All demo functionality is protected by a "Hard Gate". This is implemented via the `DEMO_MODE` environment variable and enforced by the `demoGate` middleware.

### Configuration

To enable Demo Mode, set the following environment variable:

```bash
DEMO_MODE=true
```

If this variable is missing or set to anything else (e.g., `false`, `0`, `enabled`), Demo Mode is **disabled**.

### Behavior

- **Enabled (`DEMO_MODE=true`)**:
  - Demo endpoints (e.g., `/api/demo/*`) are accessible.
  - The UI may show specific demo controls (e.g., "Reset Demo").

- **Disabled (Default)**:
  - Demo endpoints return `404 Not Found`.
  - Demo-specific code paths are skipped.

## Security Considerations

- **Production Safety**: Demo Mode should **NEVER** be enabled in production environments that host real customer data, as it may allow data resets or seeding of mock data.
- **Obscurity**: Disabled demo endpoints return `404` rather than `403` to minimize surface area visibility.

## Implementation Details

- **Gate Utility**: `server/src/demo/gate.ts` - `isDemoEnabled()`
- **Middleware**: `server/src/demo/middleware.ts` - `demoGate`

## Usage

In your routes:

```typescript
import { demoGate } from "../demo/middleware.js";

router.post("/reset", demoGate, (req, res) => {
  // Reset logic here
});
```

## Local Verification

If standard CI tests are unavailable or failing due to environment issues (e.g., missing dependencies in a constrained sandbox), you can verify the logic using the standalone `tsx` script:

```bash
# Run from the repository root
cd server && npx tsx ../test/demo-gate/verify.ts
```

This script verifies:

1. `isDemoEnabled` logic against various `DEMO_MODE` values.
2. `demoGate` middleware blocking behavior (404) when disabled.
3. `demoGate` passthrough behavior when enabled.
