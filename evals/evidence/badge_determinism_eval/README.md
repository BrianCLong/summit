# Badge Determinism Eval

## Goal
Verify that the public `badge.json` payload is byte-identical across repeated runs with the same inputs.

## Procedure
1. Run the badge emitter twice with identical environment variables.
2. Compare the outputs for a byte-for-byte match.

## Expected Result
`badge.json` files are identical and contain no timestamps.
