# C2PA Bridge Toolkit

`@ga-graphai/c2pa-bridge` provides a TypeScript/Node.js toolkit for creating and verifying
C2PA-inspired provenance manifests for generated images and documents. The toolkit can stamp
assets with signing metadata, produce derivative manifests that respect chain-of-custody, and
verify claims both on the command line and in the browser.

## Features

- **Stamping API** – generate manifests that capture tool chains, dataset lineage IDs, policy
  hashes, signer identity, and deterministic content hashes.
- **Redaction-safe derivatives** – re-sign child assets while linking back to parent manifests and
  preserving tamper detection across the chain.
- **Verifier CLI** – the `cpb` command validates manifest signatures, asset integrity, and
  parent/child relationships.
- **Browser verifier demo** – client-side verification powered by WebCrypto for interactive review
  without uploading assets to a server.

## Installation

```bash
cd ga-graphai/packages/c2pa-bridge
npm install
```

## Building

```bash
npm run build
```

This produces Node-ready artifacts in `dist/` and a browser ES module bundle in `dist/browser/`.

## CLI Usage

```
Usage: cpb [options] [command]

C2PA provenance bridge toolkit

Commands:
  stamp [options] <asset>    Stamp an asset with provenance metadata
  derive [options] <asset>   Create a derivative manifest that preserves chain of custody
  verify [options]           Verify a provenance manifest against an asset
  help [command]             display help for command
```

### Stamp

```bash
cpb stamp ./image.png \
  --dataset dataset-123 \
  --policy policy-hash \
  --signer signer-id \
  --private-key private.pem \
  --public-key public.pem \
  --tool "generator@1.0.0|prompt=text-to-image" \
  --note "initial render"
```

### Derive

```bash
cpb derive ./image-redacted.png \
  --parent ./image.png.cpb.json \
  --signer signer-redactor \
  --private-key redactor-private.pem \
  --public-key redactor-public.pem \
  --parent-public-key public.pem \
  --parent-asset ./image.png \
  --tool "redactor@0.3.0|technique=blur" \
  --redaction "faces blurred"
```

### Verify

```bash
cpb verify \
  --manifest ./image.png.cpb.json \
  --asset ./image.png \
  --public-key public.pem
```

Use `--parent-manifest`, `--parent-public-key`, and `--parent-asset` to validate derivative chains.
Add `--json` to emit a structured verification report.

## Browser Demo

1. Build the package: `npm run build`.
2. Serve the `demo/` folder (e.g., `npx http-server demo`).
3. Load `index.html`, provide an asset, its manifest, and the signer public key. Verification runs
   entirely in the browser via `verifyManifestInBrowser`.

## Testing

```bash
npm test
```

The test suite exercises stamping, tamper detection, and derivative re-signing flows using Node's
built-in test runner.
