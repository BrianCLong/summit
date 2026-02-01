import uuid
import contextvars
from functools import wraps
from typing import Optional, Callable
from summit.governance.events.schema import AuditEvent
from summit.governance.storage.aeg_store import AEGStore
from summit.governance.dae.envelope import DeterministicActionEnvelope

# Context var to hold current trace ID and DAE
trace_context: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("trace_context", default=None)
dae_context: contextvars.ContextVar[Optional[DeterministicActionEnvelope]] = contextvars.ContextVar("dae_context", default=None)

class GovernanceMiddleware:
    def __init__(self, store: AEGStore, service_name: str = "summit-runtime"):
        self.store = store
        self.service_name = service_name

    def wrap_tool(self, tool_name: str, func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            trace_id = trace_context.get() or str(uuid.uuid4())
            token = trace_context.set(trace_id)

            # Get DAE if available
            dae = dae_context.get()

            # Emit ToolProposed
            self.store.record_event(AuditEvent(
                trace_id=trace_id,
                event_type="ToolProposed",
                actor=self.service_name,
                metadata={"tool": tool_name, "args": {k: str(v) for k, v in kwargs.items()}}
            ))

            try:
                # Execute with DAE if present, else direct
                if dae:
                    result = dae.wrap_execution(tool_name, func, **kwargs)
                else:
                    result = func(*args, **kwargs)

                # Emit ToolExecuted
                self.store.record_event(AuditEvent(
                    trace_id=trace_id,
                    event_type="ToolExecuted",
                    actor=self.service_name,
                    metadata={"tool": tool_name, "result_summary": "success"}
                ))
                return result
            except Exception as e:
                self.store.record_event(AuditEvent(
                    trace_id=trace_id,
                    event_type="ToolFailed",
                    actor=self.service_name,
                    metadata={"tool": tool_name, "error": str(e)}
                ))
                raise e
            finally:
                trace_context.reset(token)
        return wrapper
