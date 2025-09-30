# SafeJoin TypeScript SDK

This package offers a minimal TypeScript helper for orchestrating SafeJoin PSI
sessions. It keeps identifiers on the client by hashing them with an
ECDH-derived secret and optionally adds Laplace noise before sharing
aggregates.

```ts
import { SafeJoinClient, SafeJoinParticipant, preparePayload } from '@summit/safejoin';

const client = new SafeJoinClient('http://localhost:8080');
const alice = new SafeJoinParticipant();
const sessionId = await client.createSession('aggregate', { epsilon: 1.0 });

await client.register(sessionId, 'alice', alice.publicKeyB64);
const peerKey = await client.waitForPeer(sessionId, 'alice');

const records = [
  { key: 'user-001', value: 3.1 },
  { key: 'user-002', value: 1.2 },
];
const payload = preparePayload(alice, peerKey, records, 1.0);
await client.upload(sessionId, {
  participant_id: 'alice',
  hashed_tokens: payload.tokens,
  bloom_filter: payload.bloom.encode(),
  aggregates: payload.aggregates,
});
const result = await client.fetchResult(sessionId);
console.log(result);
```
