# Manifest Verification

Shard manifests enable recipients to verify integrity without access to unshared shards.

## Verification Steps

1. Validate manifest signature.
2. Verify replay token matches policy scope and scan configuration.
3. Validate shard commitment against payload hash + salt.
