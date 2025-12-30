# Control Evidence Compiler

Defines structure for mapping telemetry to NIST SP 800-171 Rev. 3 controls and assembling assessment artifacts.

- **Control catalog:** control ID, family, objective mapping, DFARS/CMMC link.
- **Telemetry mapping:** rule set pointing telemetry sources → control evidence signals; supports exclusion and impact estimation.
- **Evidence bundle:** control entries with hashes of supporting traces, SSP pointers, POA&M deltas, assessment status indicator.
- **Replay token:** binds to policy version, telemetry schema version, assessment window.
- **Continuous compliance:** caches per-control bundles; exports DFARS 7019/7020 readiness artifacts suitable for SPRS.
