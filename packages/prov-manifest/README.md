# Provenance Manifest

This package provides a standalone library and CLI for generating and verifying provenance manifests.

## Installation

```bash
pnpm install @intelgraph/prov-manifest
```

## Usage

### CLI

The CLI provides two commands: `generate` and `verify`.

#### `generate`

The `generate` command creates a manifest for a given directory.

```bash
prov-manifest generate <exportDir>
```

This will create a `manifest.json` file in the specified directory.

#### `verify`

The `verify` command verifies the integrity of a manifest and its associated files.

```bash
prov-manifest verify <manifestPath> <exportDir>
```

This will check the manifest and all the files it references, and it will report any errors it finds.

### Library

The library provides two functions: `generateManifest` and `verifyManifest`.

#### `generateManifest`

The `generateManifest` function creates a manifest for a given directory.

```typescript
import { generateManifest } from "@intelgraph/prov-manifest";

const manifest = await generateManifest("/path/to/export/dir", {
  // Optional metadata
});
```

#### `verifyManifest`

The `verifyManifest` function verifies the integrity of a manifest and its associated files.

```typescript
import { verifyManifest } from "@intelgraph/prov-manifest";

const result = await verifyManifest("/path/to/manifest.json", "/path/to/export/dir");

if (result.success) {
  console.log("Manifest verification successful!");
} else {
  console.error("Manifest verification failed:");
  result.errors.forEach((error) => console.error(`- ${error}`));
}
```
