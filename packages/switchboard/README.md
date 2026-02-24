# @summit/switchboard

The control plane for capability-based routing and policy enforcement.

## Overview

Summit Switchboard is responsible for matching tool call requests to capabilities, enforcing deny-by-default policies, and brokering credentials for authorized execution.

## Key Features

- **Registry**: In-memory registry of available capabilities.
- **Policy Enforcement**: Deny-by-default preflight checks.
- **Action Receipts**: Deterministic audit trail for every request.
- **Routing**: Deterministic routing outcomes.

## Usage

```typescript
import { SwitchboardRouter, Registry, DenyAllPolicyClient, DisabledCredentialBroker } from '@summit/switchboard';

const registry = new Registry();
const policy = new DenyAllPolicyClient();
const broker = new DisabledCredentialBroker();
const router = new SwitchboardRouter(registry, policy, broker);

const response = await router.routeToolCall({
  capabilityId: 'test-cap',
  tenantId: 'tenant-1',
  actorId: 'user-1',
  inputs: { key: 'value' }
});
```
