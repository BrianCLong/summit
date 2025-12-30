# Selective Disclosure

## Processing

- Apply aggregation (counts, ranges, hashed indicators) to raw scan results.
- Redact sensitive fields per sensitivity class with weighted budget decrements.
- Prefer passive modules unless authorization token enables active probing.

## Output Controls

- Capsule ledger includes module identifiers, commitments, and compliance rationales.
- Transparency log entries optionally include capsule digests.
