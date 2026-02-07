# Reproducible Images (CI)

## Policy

Builds must normalize timestamps and avoid embedding run-specific metadata in image layers. Use
`SOURCE_DATE_EPOCH` derived from the commit timestamp and emit runtime metadata as a separate
artifact.

Governance anchor: `docs/SUMMIT_READINESS_ASSERTION.md`.

## Source Date Epoch

```
SOURCE_DATE_EPOCH=$(git log -1 --format=%ct)
```

Use the value as a build argument for Docker builds to normalize timestamps.

## Runtime Stamps

Runtime stamps (run IDs, timestamps, runner data) must be emitted outside the image. See
`docs/evidence/stamps.md` for the deterministic vs runtime stamp split.
