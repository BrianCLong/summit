# @summit/jpr

TypeScript bindings for the Jurisdictional Policy Resolver (JPR). The package shells out to the Go CLI to compile YAML matrices into a deterministic decision table and caches the result with TTL + ETag semantics.

## Installation

```bash
npm install @summit/jpr
```

Ensure the Go toolchain is available in the environment when the bindings run.

## Usage

```ts
import { JurisdictionalPolicyResolver } from '@summit/jpr';

const resolver = new JurisdictionalPolicyResolver({
  policiesPath: '/etc/policies/jpr.yaml'
});

const decision = resolver.can({
  action: 'share',
  jurisdiction: 'DE',
  dataClass: 'sensitive',
  purpose: 'marketing',
  decisionTime: new Date('2024-06-01')
});

console.log(decision.allowed);

const explanation = resolver.explain({
  action: 'share',
  jurisdiction: 'DE',
  dataClass: 'sensitive',
  purpose: 'marketing',
  decisionTime: new Date('2024-06-01')
});

console.table(explanation.chain);
```

### Custom CLI locations

Pass a `cliCommand` array or `cliCwd` to point the bindings at a custom build of `jprcli`:

```ts
const resolver = new JurisdictionalPolicyResolver({
  policiesPath: 'policies.yaml',
  cliCommand: ['/usr/local/bin/jprcli'],
  cliCwd: '/var/lib/jpr'
});
```

The binding hashes the YAML to compute an ETag and will recompile when the document changes or the TTL returned by the Go engine expires.

