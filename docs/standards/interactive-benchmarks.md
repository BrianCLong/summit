# Interactive Benchmark Standards

## Core Principles
1. **Determinism**: Every benchmark run must produce the exact same outcome given the same agent and random seed. Time/date outputs must be fixed (e.g., `1970-01-01T00:00:00Z`) inside traces to ensure stability.
2. **Budgeting**: All environments must expose a strict action/step budget and a wall-clock timeout.
3. **Artifact Integrity**: All produced outputs must strictly adhere to the schemas defined in `artifact/schemas/benchmark/interactive/`.
4. **Evidence IDs**: Every interactive benchmark run must be uniquely identifiable via an ID matching `^SUMMIT-IB-[a-zA-Z0-9_]+-[a-zA-Z0-9_]+-[0-9]+$`.

## Prohibited Behaviors
- Direct access to live internet sources that break determinism (must be stubbed or use golden datasets).
- Undocumented tool execution outside the benchmark sandbox.
- Variable sleep/wait times that affect output traces.
