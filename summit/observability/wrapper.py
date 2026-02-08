import time
from typing import Any, Dict, Optional
from opentelemetry import trace
from .evidence import evidence_id as gen_evidence_id
from .writer import ObservabilityWriter
from .provenance import DecisionProvenance
from .state import StateSnapshot
from .redaction import Redactor

tracer = trace.get_tracer("summit.observability.agent")

class ObservableAgent:
    def __init__(self, agent: Any, agent_id: str = None, redactor: Redactor = None):
        self.agent = agent
        self.agent_id = agent_id or getattr(agent, "name", "unknown_agent")
        self.redactor = redactor or Redactor()
        self.writer: Optional[ObservabilityWriter] = None
        self.provenance: Optional[DecisionProvenance] = None

    def _ensure_observability(self, inputs: Dict[str, Any]):
        eid = gen_evidence_id(inputs)
        # Re-initialize writer if evidence ID changes (new run)
        if not self.writer or self.writer.evidence_id != eid:
            self.writer = ObservabilityWriter(eid)
            self.provenance = DecisionProvenance(eid)

    def decide(self, request: Dict[str, Any]) -> Dict[str, Any]:
        return self._wrap_execution("decide", request)

    def process(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Support for ShadowAgent interface."""
        return self._wrap_execution("process", inputs)

    def _wrap_execution(self, method_name: str, inputs: Dict[str, Any]) -> Dict[str, Any]:
        self._ensure_observability(inputs)

        with tracer.start_as_current_span(f"agent.{method_name}") as span:
            span.set_attribute("agent.id", self.agent_id)
            if self.writer:
                span.set_attribute("evidence.id", self.writer.evidence_id)

            # Capture Input State
            snapshot_in = StateSnapshot(self.agent_id, f"{method_name}_start", inputs, {}, timestamp=time.time())
            if self.writer:
                self.writer.write_event({"type": "state_snapshot", **snapshot_in.to_dict(self.redactor)})

            # Execute
            method = getattr(self.agent, method_name)
            result = {}
            error = None
            try:
                result = method(inputs)
            except Exception as e:
                error = str(e)
                span.record_exception(e)
                raise e
            finally:
                # Capture Output State
                snapshot_out = StateSnapshot(self.agent_id, f"{method_name}_end", inputs, {"result": result, "error": error}, timestamp=time.time())
                if self.writer:
                    self.writer.write_event({"type": "state_snapshot", **snapshot_out.to_dict(self.redactor)})

                    # Record Provenance
                    if self.provenance:
                        self.provenance.record_step(method_name, inputs, result, self.agent_id)
                        self.writer.write_report(self.provenance.generate_report())
                        self.writer.write_stamp()

            return result
