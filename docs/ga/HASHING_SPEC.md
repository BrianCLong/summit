# Hashing & Canonicalization Specification

To ensure deterministic addressing and verification of evidence, strict canonicalization rules are applied before hashing.

## Canonicalization Rules

The `canonicalize` function in `@intelgraph/evidence-model` implements the following rules:

1.  **Object Keys**: All object keys are sorted alphabetically.
2.  **Recursion**: This sorting is applied recursively to all nested objects.
3.  **Arrays**: Array order is preserved (as it is semantically significant). Elements within arrays are recursively canonicalized.
4.  **Formatting**: The output is a minified JSON string (no whitespace).
5.  **Unicode**: Strings are assumed to be UTF-8. Unicode normalization (NFC) should be applied if not already guaranteed by the runtime (Node.js/V8 handles this reasonably well for standard JSON, but explicit normalization steps may be added if cross-language compatibility issues arise).

## Hashing

The hash of an object is the SHA-256 hash of its canonicalized JSON string representation.

`hash(obj) = SHA256(canonicalize(obj))`

The output is a lowercase hexadecimal string.

## Example

Input:
```json
{
  "b": 2,
  "a": 1
}
```

Canonical Form:
```json
{"a":1,"b":2}
```

Hash:
`43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777`
