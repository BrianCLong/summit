# Token Format

## Required Fields

- `token_id`
- `tenant`
- `purpose`
- `allowed_identifier_types[]`
- `max_hops`
- `ttl`
- `egress_budget`
- `jurisdiction`
- `signature`
- `replay_token`

## Validation

- Signature validation against tenant public key.
- TTL enforcement at module execution time.
- Scope enforcement at graph link creation.
