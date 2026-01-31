# CKKS Backend Adapter

This adapter provides integration with real CKKS homomorphic encryption libraries (e.g., TenSEAL, SEAL).

## Dependencies
- `tenseal` (optional, gated by `HE_BACKEND=ckks`)

## Implementation details
Uses the CKKS scheme for floating-point arithmetic on encrypted data, supporting the additions and multiplications required for GNN inference.
Non-linearities are handled via polynomial approximations.
