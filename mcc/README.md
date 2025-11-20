# Model Card Compiler (MCC)

The Model Card Compiler (MCC) converts YAML model card definitions into signed JSON
governance artifacts, generates enforcement hooks for client runtimes, and exposes
supporting tooling such as a validator CLI and a static gallery UI.

## Features

- **Strict validation** – YAML cards must include metrics, intended use, data lineage IDs,
  and risk flags. Validation errors are actionable and list the missing fields.
- **Signing** – Cards are canonicalised and signed with Ed25519. Offline verification is
  supported through the `mcc verify` CLI command or the exported `verifySignature` helper.
- **Enforcement hooks** – `createEnforcementHooks` returns a `denyIfOutOfScope` guard that
  prevents client code from invoking models for undeclared or explicitly denied purposes.
- **Gallery UI** – Generate a `cards.json` dataset for the static gallery (`gallery/index.html`)
  to provide quick visibility across models.

## Getting Started

```bash
cd mcc
npm install
npm run build
```

Generate a new Ed25519 key pair (store the PEM files in `keys/`):

```bash
openssl genpkey -algorithm Ed25519 -out keys/mcc_private.pem
openssl pkey -in keys/mcc_private.pem -pubout -out keys/mcc_public.pem
```

### Validate a YAML card

```bash
npx mcc validate samples/sample-card.yaml
```

### Compile and sign a card

```bash
npx mcc compile samples/sample-card.yaml \
  --private-key keys/mcc_private.pem \
  --public-key keys/mcc_public.pem \
  --output samples/sample-card.compiled.json
```

### Verify a signed card offline

```bash
npx mcc verify samples/sample-card.compiled.json
```

### Generate enforcement hooks

```bash
npx mcc hooks samples/sample-card.compiled.json --output samples/hooks.ts
```

The generated module exports a `denyIfOutOfScope(purpose: string)` helper that throws when
executions fall outside the card’s declared intent.

### Build gallery dataset

```bash
npx mcc gallery gallery/cards.json samples/sample-card.compiled.json
```

Open `gallery/index.html` in a browser (or serve the directory) to view the aggregated
model cards.

### Sample application

`npm run sample` demonstrates how hooks reject out-of-scope invocations while allowing
approved purposes. The script also verifies signatures offline.
