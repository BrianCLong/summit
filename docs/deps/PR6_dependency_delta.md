# PR6 Dependency Delta

| Dependency | Version | Purpose | Risk |
| ---------- | ------- | ------- | ---- |
| `tenseal`  | ^0.3.14 | Real CKKS homomorphic encryption backend | Low (Isolated to adapter) |

## Security Posture
`tenseal` is a well-known library for CKKS. It is added as an optional dependency and only utilized when `HE_BACKEND=ckks` is explicitly enabled.
No impact on the default mock/CI pipeline.
