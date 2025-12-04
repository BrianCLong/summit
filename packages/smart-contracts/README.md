# @intelgraph/smart-contracts

Smart contract framework for governance, policy enforcement, and automated compliance.

## Features

- **Sandboxed Execution**: VM2-based secure contract execution
- **Gas Metering**: Resource usage tracking and limits
- **State Management**: Persistent state with change tracking
- **Access Control Policies**: Resource-based permission rules
- **Data Retention Policies**: Automated lifecycle management
- **Compliance Rules**: Framework-specific automated checks
- **Approval Workflows**: Multi-party authorization mechanisms

## Installation

```bash
pnpm add @intelgraph/smart-contracts
```

## Usage

### Deploy Contract

```typescript
import { SmartContractExecutor } from '@intelgraph/smart-contracts';
import pino from 'pino';

const executor = new SmartContractExecutor(pino());

const contract = {
  address: '0x123...',
  name: 'AccessControlPolicy',
  version: '1.0.0',
  code: `
    function checkAccess(userId, resourceId) {
      const user = getState('user:' + userId);
      const resource = getState('resource:' + resourceId);

      if (user.role === 'admin') return true;
      if (resource.owner === userId) return true;
      if (resource.permissions.includes(userId)) return true;

      return false;
    }
  `,
  abi: {
    functions: [{
      name: 'checkAccess',
      inputs: [
        { name: 'userId', type: 'string' },
        { name: 'resourceId', type: 'string' }
      ],
      outputs: [{ name: 'allowed', type: 'boolean' }],
      stateMutability: 'view'
    }],
    events: []
  },
  deployer: 'admin-user',
  deployedAt: Date.now(),
  state: {}
};

await executor.deployContract(contract);
```

### Execute Contract

```typescript
const context = {
  caller: 'user-123',
  contract: '0x123...',
  blockHeight: 1000,
  blockHash: '0xabc...',
  timestamp: Date.now(),
  transactionId: 'tx-456'
};

const result = await executor.executeContract(
  '0x123...',
  'checkAccess',
  ['user-123', 'resource-789'],
  context
);

if (result.success) {
  console.log('Access allowed:', result.returnValue);
  console.log('Gas used:', result.gasUsed);
  console.log('State changes:', result.stateChanges);
}
```

## Contract Examples

### Access Control Policy

```javascript
function checkAccess(userId, resourceId, action) {
  const policy = getState('policy:access_control');

  for (const rule of policy.rules) {
    if (rule.resource === resourceId && rule.action === action) {
      // Evaluate conditions
      const user = getState('user:' + userId);

      for (const condition of rule.conditions) {
        if (!evaluateCondition(user, condition)) {
          return rule.effect === 'deny';
        }
      }

      return rule.effect === 'allow';
    }
  }

  return false; // Default deny
}
```

### Data Retention Policy

```javascript
function enforceRetention(dataId) {
  const data = getState('data:' + dataId);
  const policy = getState('policy:retention');

  const ageInDays = (Date.now() - data.createdAt) / (24 * 60 * 60 * 1000);

  if (ageInDays > policy.deleteAfterDays) {
    emit('DataDeletionRequired', { dataId });
    return 'delete';
  } else if (ageInDays > policy.archiveAfterDays) {
    emit('DataArchivalRequired', { dataId });
    return 'archive';
  }

  return 'retain';
}
```

## License

MIT
