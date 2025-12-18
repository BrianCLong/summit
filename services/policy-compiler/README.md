# License/Authority Policy Compiler (LAC)

Compiles YAML case policies into executable authorization checks. Provides policy simulation, diffing, and Express middleware for enforcement.

## Quick Start

```bash
pnpm install && pnpm build
```

## Usage

```typescript
import { PolicyCompiler } from '@intelgraph/policy-compiler';
import fs from 'fs';

const compiler = new PolicyCompiler();
const policyYAML = fs.readFileSync('policies/sample-policy.yaml', 'utf-8');
const policy = compiler.loadFromYAML(policyYAML);

// Evaluate authorization
const result = compiler.evaluate('investigation-policy', {
  resource: '/api/entities',
  action: 'read',
  user: { clearance: 'SECRET', role: 'analyst' }
});

console.log(result.allowed); // true or false
```

## Features

- ✅ YAML policy definition
- ✅ Resource/action-based authorization
- ✅ Clearance-level checks
- ✅ Policy simulation (`lac simulate`)
- ✅ Policy diffing (`lac diff`)
- ✅ Express middleware

See policies/sample-policy.yaml for policy format.
