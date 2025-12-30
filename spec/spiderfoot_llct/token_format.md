# Linkage-Limited Correlation Token Format

## Fields
- Identifier type set
- Max hop count
- Time-to-live
- Egress limit (bytes or classification level)
- Jurisdiction attribute
- Replay token (module versions, time window)
- Signature binding tenant and purpose

## Validation
- Signature verification with tenant key.
- TTL and jurisdiction checked by policy gateway.
- Cache validated decisions for the token TTL.
