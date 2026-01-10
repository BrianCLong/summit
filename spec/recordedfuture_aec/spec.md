# Recorded Future AEC - Assessment Evidence Compiler

## Overview

AEC compiles telemetry into control-evidence bundles aligned to NIST SP 800-171 Rev. 3 and produces assessment-ready artifacts for DFARS 7019/7020 and CMMC readiness.

## Inputs

- Telemetry events
- Control mapping rules
- Assessment window metadata

## Outputs

- Control-evidence bundle
- Assessment status indicator
- SSP pointer and POA&M delta
- Replay token

## Policy Gate

- Evidence sufficiency enforced via `intelgraph.policy.contracting` before export.
