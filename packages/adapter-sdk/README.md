# Adapter SDK

The Adapter SDK provides helpers for packaging, signing, and verifying adapter bundles with SBOM
and SLSA attestations.

## Features

- JSON schemas for adapter manifests, compatibility matrices, and configuration schemas
- Bundle builder that validates inputs, includes SBOM + SLSA, and signs with Cosign
- Verifier that checks signatures, digests, and runtime compatibility before accepting a bundle

## Usage

```ts
import {
  buildAdapterBundle,
  verifyAdapterBundle,
  type BundleBuildOptions,
} from "@intelgraph/adapter-sdk";

const result = await buildAdapterBundle({
  manifest,
  compatibility,
  sourceDir: "./dist/adapter",
  configSchemaPath: "./config.schema.json",
  signingKeyPath: "./cosign.key",
});

await verifyAdapterBundle({
  bundlePath: result.bundlePath,
  signaturePath: result.signaturePath,
  publicKeyPath: "./cosign.pub",
  expectedSdkVersion: manifest.sdkVersion,
});
```
