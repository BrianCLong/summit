# @summitsec/vcr-kit

`@summitsec/vcr-kit` is a TypeScript toolkit and CLI for issuing, verifying, and revoking W3C Verifiable Credential (VC) consent receipts. It focuses on portable credentials for recording processing purpose, scope, retention, and tenant metadata and validates receipts completely offline.

## Features

- **Issuing** — create [ConsentReceiptCredential](https://w3id.org/consent) VC payloads with issuer/subject DIDs, purpose, scope, retention and lawful basis metadata.
- **Offline verification** — deterministic JSON canonicalisation plus Ed25519 signature validation with support for `did:key` (auto-derived) and configurable `did:web` DID documents.
- **Revocation** — append-only JSON revocation lists that are consulted during verification and via the CLI.
- **CLI** — `vcr-kit` command for issuing, verifying, and revoking credentials without a network connection.
- **Middleware** — `consentPresent()` Express middleware for JavaScript/TypeScript services and a matching ASGI middleware in `sdk/python/vcr_kit` for FastAPI/Starlette applications.
- **Fixtures** — sample policies, DID documents, and revocation lists for rapid prototyping.

## Installation

```bash
pnpm add @summitsec/vcr-kit
# or
npm install @summitsec/vcr-kit
```

The CLI is exposed as `vcr-kit` once the package is installed.

## CLI usage

Issue a consent receipt for a data processing purpose:

```bash
vcr-kit issue \
  --issuer-did did:key:zExampleIssuer \
  --issuer-key base58:3Fft... \
  --subject did:key:zExampleSubject \
  --tenant summit-retail \
  --purpose marketing-updates:"Send product news" \
  --scope email:send,personalize \
  --retention-policy https://policies.summit.example/privacy#retention \
  --retention-expires 2026-01-01T00:00:00Z \
  --lawful-basis consent \
  --output ./receipts/alice.json
```

Verify the receipt offline, providing a local DID document for `did:web` issuers and the revocation list JSON produced by `vcr-kit revoke`:

```bash
vcr-kit verify receipts/alice.json \
  --revocations data/revocations.json \
  --did-doc did:web:consent.summit.example=fixtures/did-web-summit.json
```

Revoke a credential immediately:

```bash
vcr-kit revoke urn:uuid:revoked-example --revocations data/revocations.json
```

## Library usage (TypeScript)

```ts
import {
  InMemoryDidResolver,
  issueConsentReceipt,
  consentPresent,
  FileRevocationRegistry,
  verifyConsentReceipt,
} from '@summitsec/vcr-kit';

const resolver = new InMemoryDidResolver();
const revocations = new FileRevocationRegistry('data/revocations.json');

const credential = await issueConsentReceipt({
  issuerDid: 'did:key:zExampleIssuer',
  issuerPrivateKey: issuerKeyBytes,
  subject: { id: 'did:key:zExampleSubject' },
  claims: {
    purpose: [{ purposeId: 'marketing-updates' }],
    scope: [{ resource: 'email', actions: ['send'] }],
    retention: {
      policyUri: 'https://policies.summit.example/privacy#retention',
      expiresAt: '2026-01-01T00:00:00Z',
    },
    tenant: 'summit-retail',
  },
});

const result = await verifyConsentReceipt(credential, {
  resolver,
  revocationRegistry: revocations,
});
```

Register the Express middleware to block missing or revoked receipts:

```ts
import express from 'express';
import bodyParser from 'body-parser';
import { consentPresent, InMemoryDidResolver } from '@summitsec/vcr-kit';

const app = express();
app.use(bodyParser.json());

const resolver = new InMemoryDidResolver([didWebDoc]);

app.use(
  consentPresent({
    resolver,
    revocationRegistry: revocations,
  }),
);
```

## Python helper usage

Install the optional Python module located at `sdk/python/vcr_kit` into your application environment and ensure [`PyNaCl`](https://pypi.org/project/PyNaCl/) is available:

```python
from vcr_kit import ConsentVerifier, InMemoryDidResolver, JsonRevocationRegistry, consent_present

resolver = InMemoryDidResolver()
revocations = JsonRevocationRegistry('data/revocations.json')
verifier = ConsentVerifier(resolver, revocations=revocations)

app.add_middleware(
    consent_present(verifier),
)
```

The middleware rejects HTTP requests that lack a valid, unexpired receipt or whose credential ID is present in the revocation list.

## Fixtures

- [`samples/marketing-policy.json`](samples/marketing-policy.json) – consent policy metadata for marketing communications.
- [`fixtures/did-web-summit.json`](fixtures/did-web-summit.json) – offline DID document for a `did:web` issuer.
- [`fixtures/revocations.json`](fixtures/revocations.json) – example revocation list structure.

## Testing

Install dependencies with `pnpm install --filter @summitsec/vcr-kit` and then run `pnpm build --filter @summitsec/vcr-kit` to transpile the TypeScript sources. The `test` script is wired for Node 20+ `node --test` suites emitted into `dist/`.
