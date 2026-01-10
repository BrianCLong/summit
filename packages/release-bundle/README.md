# @summit/release-bundle

SDK for parsing and loading release bundles.

## Usage

### Browser (Switchboard)

The default entrypoint is browser-safe and does not include Node.js polyfills.

```typescript
import { parseManifest, parseChecksums, ReleaseStatus } from "@summit/release-bundle";

const manifestJson = await fetch('/release-manifest.json').then(r => r.text());
const status: ReleaseStatus = parseManifest(manifestJson);
```

### Node.js

For server-side usage with filesystem access, import from the `/node` subpath.

```typescript
import { loadBundleFromDir } from "@summit/release-bundle/node";

const bundle = loadBundleFromDir('./dist/release');
console.log(bundle.manifest.tag);
```
