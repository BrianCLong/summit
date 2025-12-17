# Summit SDK (Python)

This package provides the Python implementation of the Summit Developer SDK v0.1. It emphasizes graph-native flows, policy-aware primitives, and telemetry-by-design defaults.

## Quickstart
```bash
cd impl/sdk/python
python -m pip install -e .
python examples/hello_world.py
```

## Testing
Run the lightweight unit suite to verify tool validation, flow graphs, RAG mocks, and telemetry outputs:

```bash
cd impl/sdk/python
python -m pip install -e .[dev]
pytest
```

## Features
- `SummitClient` with pluggable transports (local mock included).
- `@tool` decorator for typed tools and audit metadata.
- `@flow` decorator that produces runnable graphs and emits trace envelopes.
- RAG helper (`KnowledgeBase`) and `PolicyContext` for governance-first calls.
- Trace emitter with OTLP-ready structure and stdout fallback.

## Compatibility
The v0.1 surface is designed to stay compatible as we scale to larger hosted models and new transports. Capability flags and policy merging ensure migration-safe upgrades.

