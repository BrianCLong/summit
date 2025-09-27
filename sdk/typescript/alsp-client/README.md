# @summit/alsp-client

TypeScript companion client for the Audit Log Succinctness & Proofs (ALSP) library.

## Features

- Minimal `AlspTransport` abstraction with HTTP and in-memory implementations.
- `AlspClient` helper that requests proofs and immediately verifies them locally.
- Deterministic `ReplaySession` to step through stored proofs in order.
- Merkle verification and digest derivations matching the Go reference implementation.

## Usage

```ts
import { AlspClient, AlspVerifier, HttpTransport } from "@summit/alsp-client";

const verifier = new AlspVerifier(/* optional trusted head digest */);
const client = new AlspClient(new HttpTransport("https://alsp.example"), verifier);

const { proof, verification } = await client.proveRange({ start: 100, end: 160 });
console.log("verified head", verification.headDigest);
```

All digests are expressed as base64 strings in the JSON wire format, matching the Go encoder output.
