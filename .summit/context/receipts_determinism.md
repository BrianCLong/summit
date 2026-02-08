# Receipts Determinism Learnings

- `cbor` package version `^9.0.2` (used in root) supports `encodeCanonical`.
- `cbor.encodeCanonical` is necessary to ensure that the hash of a receipt is independent of the order of keys in the JSON payload, which is critical for robust verification across different environments/languages.
- The regression test `tests/regression/test_receipt_bundle_reproducible.py` successfully verifies this behavior by running the generation twice and comparing the resulting hashes.
- `tsx` allows running TypeScript files directly without a build step, which is very convenient for evaluation scripts and tests.
- Workspace packages can be referenced via relative paths in tests (`../../packages/...`) to avoid build/link issues during early development.
