# Side-Channel Budget Auditor (SCBA)

SCBA is a lightweight harness for quantifying side-channel leakage across HTTP
APIs and microservices. It focuses on micro-architectural and protocol-level
signals such as latency, payload sizing, and cache hints.

## Features

- **Controlled runners** with deterministic seeds for reproducibility.
- **Leak budget policies** per endpoint with mitigation toggles.
- **Hypothesis testing** (Welch t-test with permutation fallback) to detect
  statistically significant leakage.
- **Canned attack modules** for length-based, cache warmness, and coarse timing
  channels.
- **CI gate integration** via JSON reports and non-zero exit codes when budgets
  are exceeded.
- **Polyglot entry points**: Python package and Go CLI wrapper.

## Quickstart

1. Define a policy file:

```json
{
  "payments:create": {
    "budget": {
      "latency_ms": 8.0,
      "payload_bytes": 16.0,
      "cache_hint": 0.3
    },
    "mitigations": {
      "padding": true
    }
  }
}
```

2. Run the auditor against an endpoint:

```bash
python -m tools.scba.cli policy.json payments:create https://api.example.com/payments --attack length
```

The command prints JSON records summarising each attack. Non-compliant findings
should be consumed by your CI job to fail the build.

## Go wrapper

A minimal Go front-end is provided under `tools/scba/cmd/scba`. Build it with:

```bash
(cd tools/scba/cmd/scba && go build)
```

The compiled binary mirrors the Python CLI arguments and forwards execution to
the Python package via `python -m tools.scba.cli`.
