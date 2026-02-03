# Determinism Smoke (spec)

Must fail if:
- Two sequential generator runs produce byte-for-byte differing output in 'generated/'.

Must pass if:
- Generator output is identical across multiple runs.
