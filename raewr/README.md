# Residency-Attested Edge WASM Runner (RAEWR)

RAEWR is a lightweight edge runtime that executes WebAssembly functions while attaching
verifiable residency attestations to every invocation. Each attestation captures the
region, node identifier, and the policy hash that governed execution. The attestation is
signed so that it can be verified offline, enabling consumers to guarantee that the code
ran in the permitted geography before trusting the results.

## Features

- **Deterministic attestation chain** – invocation identifiers and chain digests are
  derived from the module and arguments, ensuring identical deployments yield identical
  attestation chains.
- **Residency enforcement policy** – execution is denied when the runtime is configured
  for a region that is not authorized or when attestations cannot be produced.
- **TypeScript SDK** – embed the runtime, register WASM workloads, and inspect residency
  attestations directly from TypeScript applications.
- **Verifier CLI** – validate attestations offline using the public key and residency
  policy.

## Packages

- `src/runtime.ts` – core runtime that loads WASM modules and enforces policy.
- `src/sdk.ts` – ergonomic TypeScript client SDK for invoking workloads.
- `src/cli/raewr-verify.ts` – command line attestation verifier.
- `policies/default-policy.json` – example residency policy denying execution without a
  valid attestation and limiting execution to a specific region.

## Usage

### Building

```bash
cd raewr
npm install
npm run build
```

### Prepare the sample module

The repository ships a text-format WebAssembly module at
`samples/add.wat`. Compile it to a binary before running the examples:

```bash
cd raewr
wat2wasm samples/add.wat -o samples/add.wasm
```

If you do not have `wat2wasm` installed locally, install the WABT tooling
(`brew install wabt` on macOS or `apt-get install wabt` on Debian/Ubuntu)
or use `npx @webassemblyjs/wabt` as a drop-in replacement.

### Running a WASM function with attestations

```ts
import { RaewrRuntime } from '@summit/raewr';
import defaultPolicy from '../policies/default-policy.json' assert { type: 'json' };

const runtime = new RaewrRuntime({
  region: 'us-east-1',
  nodeId: 'edge-node-001',
  policy: defaultPolicy,
  privateKeyPath: new URL('../keys/ed25519.json', import.meta.url).pathname,
});

const { result, attestation } = await runtime.invoke({
  wasmPath: new URL('../samples/add.wasm', import.meta.url).pathname,
  exportName: 'add',
  args: [2, 3],
});

console.log(result); // -> 5
console.log(attestation.chainDigest);
```

### Verifying an attestation offline

```bash
node dist/cli/raewr-verify.js attestations/add.json --public-key keys/ed25519.json --policy policies/default-policy.json
```

The verifier validates the signature, checks that the policy hash matches, and ensures the
attestation chain digest is consistent with the invocation payload. When a residency
policy declares a `minimumChainLength`, the chain verifier also asserts that the supplied
attestation history meets that threshold.

## Policy expectations

The provided `default-policy.json` denies execution for any region other than
`us-east-1` and refuses to run workloads if an attestation cannot be produced. Customize
the `allowedRegions` array to align with your residency requirements.
