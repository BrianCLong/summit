import json
import logging
import uuid
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, ValidationError

# Mocking the actual clients for the prototype demonstration if they can't be imported easily,
# but in the real implementation we would import them.
# For this prototype, we'll assume they are available or we wrap the existing engine.

try:
    from python.counter_psyops_engine import PsyOpsCounterEngine
    from intelgraph_api_client import IntelGraphAPIClient
    from intelgraph_neo4j_client import IntelGraphNeo4jClient
    from intelgraph_postgres_client import IntelGraphPostgresClient
except ImportError:
    # Fallback mocks for development/demonstration if needed
    class PsyOpsCounterEngine: pass
    class IntelGraphAPIClient: pass
    class IntelGraphNeo4jClient: pass
    class IntelGraphPostgresClient: pass

logger = logging.getLogger(__name__)

# --- Layer 3: Contract-Driven Models ---

class NarrativeDetectionContract(BaseModel):
    intelgraph_narrative_id: str
    is_adversarial: bool
    sentiment: Dict[str, Any]
    entities: List[Any]
    source_data: Dict[str, Any]

class AnalysisContract(BaseModel):
    psyops_indicators: Dict[str, bool]
    narrative_analysis: NarrativeDetectionContract

class CounterMessageContract(BaseModel):
    counter_message: str
    channels: List[str]
    narrative_id: str

class ObfuscationContract(BaseModel):
    final_message: str
    original_message: str

# --- Layer 2: Canonical State Store ---

class WorkflowState(BaseModel):
    task_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    input_data: Dict[str, Any]
    detection: Optional[NarrativeDetectionContract] = None
    analysis: Optional[AnalysisContract] = None
    counter_message: Optional[CounterMessageContract] = None
    obfuscation: Optional[ObfuscationContract] = None
    status: str = "PENDING"
    errors: List[str] = []

# --- Layer 4: Guardrails ---

class GuardrailResult(BaseModel):
    passed: bool
    reason: Optional[str] = None

def content_safety_guardrail(message: str) -> GuardrailResult:
    """Simple example of an output guardrail."""
    forbidden_words = ["error_code_red", "DEBUG_SECRET"]
    for word in forbidden_words:
        if word in message:
            return GuardrailResult(passed=False, reason=f"Forbidden word detected: {word}")
    return GuardrailResult(passed=True)

# --- Layer 1: Deterministic Orchestrator ---

class RefinedPsyOpsOrchestrator:
    def __init__(self, engine: PsyOpsCounterEngine, postgres: IntelGraphPostgresClient):
        self.engine = engine
        self.postgres = postgres

    async def run_workflow(self, input_data: Dict[str, Any]) -> WorkflowState:
        state = WorkflowState(input_data=input_data)
        state.status = "PROCESSING"

        try:
            # Phase 1: Detection
            raw_detection = self.engine.detection_phase(input_data, state.task_id)
            state.detection = NarrativeDetectionContract(**raw_detection)
            self._log_state(state, "DETECTION_COMPLETE")

            # Phase 2: Analysis
            raw_analysis = self.engine.analysis_phase(state.detection.model_dump(), state.task_id)
            state.analysis = AnalysisContract(**raw_analysis)
            self._log_state(state, "ANALYSIS_COMPLETE")

            # Phase 3: Counter-Messaging
            raw_counter = self.engine.counter_messaging_generation_phase(state.analysis.model_dump(), state.task_id)
            # engine returns a string, we wrap it
            state.counter_message = CounterMessageContract(
                counter_message=raw_counter,
                channels=["default"],
                narrative_id=state.detection.intelgraph_narrative_id
            )

            # --- Guardrail Checkpoint ---
            guard_result = content_safety_guardrail(state.counter_message.counter_message)
            if not guard_result.passed:
                raise ValueError(f"Guardrail failed: {guard_result.reason}")

            self._log_state(state, "COUNTER_MESSAGE_COMPLETE")

            # Phase 4: Obfuscation
            raw_obfuscation = self.engine.obfuscation_layers_phase(
                state.counter_message.counter_message,
                state.detection.intelgraph_narrative_id,
                state.task_id
            )
            state.obfuscation = ObfuscationContract(
                final_message=raw_obfuscation,
                original_message=state.counter_message.counter_message
            )

            state.status = "COMPLETED"
            self._log_state(state, "WORKFLOW_COMPLETE")

        except ValidationError as ve:
            state.status = "FAILED"
            state.errors.append(f"Contract Validation Error: {str(ve)}")
            self._log_state(state, "VALIDATION_ERROR")
        except Exception as e:
            state.status = "FAILED"
            state.errors.append(f"Runtime Error: {str(e)}")
            self._log_state(state, "RUNTIME_ERROR")

        return state

    def _log_state(self, state: WorkflowState, event_type: str):
        logger.info(f"Workflow Event: {event_type} | Task ID: {state.task_id} | Status: {state.status}")
        # In real impl, we would persist the full state.model_dump() to Postgres
        try:
            self.postgres.log_processing_event(
                event_type=event_type,
                task_id=state.task_id,
                message=f"State update: {event_type}",
                metadata=state.model_dump()
            )
        except Exception as e:
            logger.error(f"Failed to log state to Postgres: {e}")

if __name__ == "__main__":
    # Example usage (simplified)
    print("Refined Orchestrator Prototype Loaded.")
