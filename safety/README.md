# Tool Safety Gate (Minimal)

**Goal:** No destructive side‑effects (delete, POST, exec, write) unless an explicit `approved=true` flag is present.

## How it works
- Policy: `sandbox/policy/tool_capabilities.yml` defines which tools require approval and any allowed patterns when unapproved.
- Guarded API: All privileged actions go through wrappers that consult the policy.
- Sandbox: `sandbox/runner.py` exposes only guarded functions to untrusted code.
- Tests: `tests/test_agent_tool_safety.py` asserts blocked vs allowed behaviors.

## Quickstart
```bash
pip install pytest pyyaml
pytest -q safety/tests/test_agent_tool_safety.py
```

## CI Gate

Add this job to fail GA if safety tests fail:

```yaml
# .github/workflows/safety-gate.yml
name: Tool Safety Gate
on:
  pull_request:
  push:
jobs:
  safety:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: pip install pytest pyyaml
      - run: pytest -q safety/tests/test_agent_tool_safety.py
```
