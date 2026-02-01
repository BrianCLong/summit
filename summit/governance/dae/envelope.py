import time
from typing import Any, Callable, Dict, List, Optional
from summit.governance.dae.bounds import ExecutionBounds, ExecutionCounters
from summit.governance.policy.runtime import PolicyRuntime

class BoundsViolationError(Exception):
    pass

class ApprovalRequiredError(Exception):
    pass

class PolicyViolationError(Exception):
    pass

class DeterministicActionEnvelope:
    def __init__(self, bounds: ExecutionBounds, context_id: str, policy_runtime: Optional[PolicyRuntime] = None, agent_metadata: Dict[str, Any] = None):
        self.bounds = bounds
        self.context_id = context_id
        self.counters = ExecutionCounters()
        self.counters.start_time = time.time()
        self.policy_runtime = policy_runtime
        self.agent_metadata = agent_metadata or {}

    def check_pre_execution(self, tool_name: str, args: Dict[str, Any]):
        # Check tool allowance
        if tool_name not in self.bounds.allowed_tools:
            raise BoundsViolationError(f"Tool '{tool_name}' is not in the allowed list.")

        # Check limits
        if self.counters.tool_calls_count >= self.bounds.max_tool_calls:
            raise BoundsViolationError(f"Max tool calls ({self.bounds.max_tool_calls}) exceeded.")

        elapsed = time.time() - self.counters.start_time
        if elapsed > self.bounds.max_duration_seconds:
            raise BoundsViolationError(f"Max duration ({self.bounds.max_duration_seconds}s) exceeded.")

        # Check Policy
        if self.policy_runtime:
            # We assume tool_name maps to action_type or similar.
            decision = self.policy_runtime.evaluate_action(
                agent_metadata=self.agent_metadata,
                action_type=tool_name, # Simplified mapping
                resource="unknown" # We might need resource from args
            )

            if decision.decision == "deny":
                raise PolicyViolationError(f"Policy denied action: {decision.reason}")

            if decision.decision == "needs_approval":
                # In a real system, we would check if approval token is present in args or context.
                # Here we just raise execution blocking error.
                raise ApprovalRequiredError(f"Approval required for action '{tool_name}'.")

    def record_execution(self):
        self.counters.increment_tool_calls()

    def wrap_execution(self, tool_name: str, func: Callable, **kwargs):
        self.check_pre_execution(tool_name, kwargs)
        try:
            result = func(**kwargs)
            self.record_execution()
            return result
        except Exception as e:
            # We count failed executions as usage
            self.record_execution()
            raise e
