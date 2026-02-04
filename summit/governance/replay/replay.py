from typing import List, Dict, Any, Callable
from summit.governance.events.schema import ExecutionManifest

class ReplayMismatchError(Exception):
    pass

class ReplayEngine:
    def __init__(self, manifest: ExecutionManifest):
        self.manifest = manifest
        self._current_trace_iter = None

    def create_mock_registry(self) -> Dict[str, Callable]:
        """
        Creates a registry of tools that mock execution based on the manifest.
        """
        trace_iter = iter(self.manifest.trace)
        self._current_trace_iter = trace_iter

        class MockTool:
            def __init__(self, name, engine):
                self.name = name
                self.engine = engine

            def __call__(self, **kwargs):
                return self.engine._consume_step(self.name, kwargs)

        registry = {}
        for tool_name in self.manifest.tools_allowed:
             registry[tool_name] = MockTool(tool_name, self)

        return registry

    def _consume_step(self, tool_name, kwargs):
        if self._current_trace_iter is None:
             raise RuntimeError("Replay not started. Call create_mock_registry first.")

        try:
            step = next(self._current_trace_iter)
        except StopIteration:
            raise ReplayMismatchError("Tool called but no more steps in trace.")

        if step.tool_name != tool_name:
            raise ReplayMismatchError(f"Expected tool {step.tool_name}, got {tool_name}")

        if step.inputs != kwargs:
             raise ReplayMismatchError(f"Input mismatch for {tool_name}. Expected {step.inputs}, got {kwargs}")

        return step.outputs
