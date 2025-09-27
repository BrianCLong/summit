# KKP TypeScript Client

This lightweight client targets the Keyless KMS Proxy (KKP) service. It provides:

- Helpers for issuing tokens, decrypting envelopes, and downloading JWKS metadata
- Offline token verification using Ed25519 with `@noble/ed25519`
- Fetch-agnostic HTTP helpers so it runs in Node.js or modern browsers

```ts
import { KkpClient, verifyToken } from '@summit/kkp-client';

const client = new KkpClient({ baseUrl: 'https://kkp.internal' });
const token = await client.issueToken({
  subject: 'svc',
  audience: 'app',
  backend: 'aws',
  key_id: 'alias/app',
});

const jwks = await client.fetchJwks();
const claims = await verifyToken(token.token, jwks);
```

Build artifacts:

```bash
npm install
npm run build
```
