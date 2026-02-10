# Switchboard - Action Receipts & Policy Preflight

Switchboard provides a "receipts-first" governance layer for tool execution. Every action is gated by a "deny-by-default" policy and produces a signed, deterministic receipt.

## Key Features

- **Policy Preflight**: Runs BEFORE executing any tool call. Actions are denied by default unless explicitly allowed by policy. Includes identity, tenant, and budget metadata.
- **Action Receipts**: Every tool action generates a signed receipt.
- **Deterministic Hashing**: Inputs and outputs are hashed (SHA-256) to ensure integrity without exposing raw secrets.
- **Integrity Verification**: Receipts include a cryptographic hash of their content, which can be verified at any time.

## Usage

### Action Receipt Generator

```typescript
import { ActionReceiptGenerator } from '@summit/switchboard';

const receipt = ActionReceiptGenerator.generate({
  actor: { identity: 'user-1', tenant: 'tenant-a' },
  tool: { capability: 'mcp', action: 'search', inputs: { query: 'test' } },
  policy: { decision: 'allow' },
  outputs: { results: [...] }
});
```

### Policy Preflight

```typescript
import { PolicyPreflight } from '@summit/switchboard';

const preflight = new PolicyPreflight(['mcp:search']);
const decision = preflight.evaluate(
  { identity: 'user-1', tenant: 'tenant-a' },
  { capability: 'mcp', action: 'search' }
);

if (decision.allow) {
  // Execute action
}
```

## CLI Commands

Manage and verify receipts via the `summit` CLI:

- `summit switchboard receipts list`: List all recent action receipts.
- `summit switchboard receipts view <id>`: View full JSON details of a receipt.
- `summit switchboard receipts replay <id>`: Verify the cryptographic integrity of a receipt.
