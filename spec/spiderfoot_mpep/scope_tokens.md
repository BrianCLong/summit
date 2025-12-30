# Scope Tokens

Defines scope tokens controlling sharing scope and execution policies.

## Fields

- Sharing scope identifier and TTL.
- Performer identity and purpose binding.
- Policy profile (egress defaults, endpoint allowlist, disclosure class).

## Validation

- Tokens cached for TTL; invalid tokens halt execution with recorded reason.
- Tokens influence sandbox configuration and shard partitioning.
