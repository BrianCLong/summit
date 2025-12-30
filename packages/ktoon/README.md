# @summit/ktoon

Tokenizer-aware TOON v3 superset encoder/decoder with dictionaries, adaptive table shaping, reference/patch semantics, and strict-mode validation helpers.

## Features

- **TOON compatibility**: emits strict TOON when `strict=true`, or compact KTOON with dictionaries and refs.
- **Dictionaries**: builds tokenizer-aware key and value dictionaries to shrink prompts and MCP payloads.
- **Adaptive optimizer**: converts uniform arrays into TOON tables and keeps heterogeneous structures as objects.
- **Patch support**: apply append/update/delete patches with primary-key awareness for streaming responses.
- **Rendering**: render `text/ktoon` or strict `text/toon` payloads with deterministic ordering.

## Usage

```ts
import { encodeKtoon, renderKtoon } from '@summit/ktoon';

const doc = encodeKtoon(data, { mode: 'ktoon' });
const text = renderKtoon(doc); // compact form
const strictText = renderKtoon(doc, true); // TOON-safe
```

## Development

- Build: `pnpm --filter @summit/ktoon build`
- Lint: `pnpm --filter @summit/ktoon lint`
- Test: `pnpm --filter @summit/ktoon test`
