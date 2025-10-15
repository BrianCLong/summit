# SafeJoin Python SDK

This lightweight helper wraps the SafeJoin PSI engine REST API. It keeps all
raw keys and attributes client-side by hashing records with an ECDH-derived
shared secret and applying differential privacy (DP) noise before uploading
aggregates.

## Usage

```python
from safejoin_client import SafeJoinClient, SafeJoinParticipant, prepare_payload

client = SafeJoinClient("http://localhost:8080")
participant = SafeJoinParticipant()
session_id = client.create_session("aggregate", epsilon=1.0)

peer_key = client.register(session_id, participant, "research") or \
    client.wait_for_peer(session_id, "research")

records = [("user-001", 3.2), ("user-002", 1.7)]
hashed_tokens, bloom, aggregates = prepare_payload(
    participant,
    peer_key,
    records,
    epsilon=1.0,
)
client.upload(session_id, "research", hashed_tokens, bloom, aggregates)
result = client.fetch_result(session_id)
print(result)
```

`prepare_payload` handles hashing, bloom filter materialization, and Laplace
noise on aggregates. The returned tokens and bloom filter contain only
secret-keyed hashes, so primary identifiers never leave the caller.
