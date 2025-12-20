# Jurisdictional Policy Resolver (JPR)

`jpr` compiles jurisdiction × data-class × purpose policy matrices into a deterministic decision engine.

## Features

- YAML policy authoring with precedence rules and effective dates.
- Deterministic `Can` and `Explain` APIs with explicit rule chains.
- CLI tooling for evaluations and cross-date diffs.
- TTL + ETag aware engine cache for embedding in long-lived services.
- TypeScript bindings that reuse the compiled engine for Node.js workloads.

## Usage

```bash
# Evaluate an action
cd jpr
go run ./cmd/jprcli --policies ../jpr/testdata/policies.yaml \
  --action share --jurisdiction DE --data-class sensitive --purpose marketing --explain

# Export a compiled engine snapshot for the TS bindings
go run ./cmd/jprcli --policies ../jpr/testdata/policies.yaml --mode compile > engine.json

# Compare outcomes across dates
go run ./cmd/jprdiff --policies ../jpr/testdata/policies.yaml --before 2024-05-30 --after 2024-06-02
```

## TypeScript bindings

The `sdk/jpr-ts` package wraps the Go CLI. Provide the policy path and it will compile/cache the engine on-demand:

```ts
import { JurisdictionalPolicyResolver } from '@summit/jpr';

const jpr = new JurisdictionalPolicyResolver({ policiesPath: 'path/to/policies.yaml' });
const decision = jpr.can({
  action: 'share',
  jurisdiction: 'DE',
  dataClass: 'sensitive',
  purpose: 'marketing',
  decisionTime: new Date('2024-06-01')
});
```

Set `cliCommand` or `cliCwd` in the constructor to point at a custom build of the Go CLI if necessary.

## Testing

```bash
cd jpr
go test ./...
```

The benchmark included in `engine_test.go` measures the steady-state latency and ensures p95 is maintained under the 1ms budget on modern hardware.

