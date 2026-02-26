# Modulith Violation Triage Runbook

## Overview
The Modulith check enforces architectural boundaries in the Python codebase (`summit/`). If CI fails with modularity violations, it means one module is importing from another module in a way that is not explicitly allowed in `config/modules.yaml`.

## Failure Triage Steps

1. **Identify the violation**:
   Check the CI logs for `❌ Found N modularity violations!`.
   The output will show the file, line number, and the forbidden import.
   Example: `[MBV-IMP-001] summit/ingest/pipeline.py:10 -> summit.core.utils (Forbidden: ingest to core)`

2. **Determine the cause**:
   - Is the dependency intended?
   - If yes, should it be allowed in `config/modules.yaml`?
   - Does it violate the `cross_module_requires_event` rule (i.e., importing non-event code)?

3. **Resolution**:

   ### Option A: Allow the dependency
   If the dependency is architecturally sound, update `config/modules.yaml`:
   ```yaml
   modules:
     ingest:
       path: summit/ingest
       allowed_dependencies: [core] # Add 'core' here
   ```

   ### Option B: Refactor to use Events
   If `cross_module_requires_event` is enabled, ensure the import points to an `events` submodule:
   ```python
   # Instead of:
   from summit.core.utils import SomeHelper

   # Use:
   from summit.core.events import SomeEvent
   ```

   ### Option C: Suppress (Requires Justification)
   If you must bypass the rule temporarily, add a PR comment with `#modulith-exception` and the rationale. Note that the verifier does not currently support in-code suppressions.

## Updating Configuration
After modifying `config/modules.yaml`, run the check locally to verify:
```bash
make modulith-check
```
