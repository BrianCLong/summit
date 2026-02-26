import pytest
from unittest.mock import MagicMock
from intelgraph_psyops_orchestrator_v2 import RefinedPsyOpsOrchestrator, WorkflowState, GuardrailResult

@pytest.mark.asyncio
async def test_workflow_success():
    # Setup mocks
    mock_engine = MagicMock()
    mock_postgres = MagicMock()

    mock_engine.detection_phase.return_value = {
        "intelgraph_narrative_id": "narr-123",
        "is_adversarial": True,
        "sentiment": {"label": "NEGATIVE", "score": 0.9},
        "entities": [],
        "source_data": {"content": "test content"}
    }
    mock_engine.analysis_phase.return_value = {
        "psyops_indicators": {"emotional_manipulation": True},
        "narrative_analysis": mock_engine.detection_phase.return_value
    }
    mock_engine.counter_messaging_generation_phase.return_value = "Counter message"
    mock_engine.obfuscation_layers_phase.return_value = "Obfuscated message"

    orchestrator = RefinedPsyOpsOrchestrator(mock_engine, mock_postgres)
    input_data = {"content": "test content", "source": "unit-test"}

    # Run
    state = await orchestrator.run_workflow(input_data)

    # Verify
    assert state.status == "COMPLETED"
    assert state.detection.intelgraph_narrative_id == "narr-123"
    assert state.obfuscation.final_message == "Obfuscated message"
    assert len(state.errors) == 0

@pytest.mark.asyncio
async def test_workflow_guardrail_failure():
    # Setup mocks
    mock_engine = MagicMock()
    mock_postgres = MagicMock()

    mock_engine.detection_phase.return_value = {
        "intelgraph_narrative_id": "narr-123",
        "is_adversarial": True,
        "sentiment": {"label": "NEGATIVE", "score": 0.9},
        "entities": [],
        "source_data": {"content": "test content"}
    }
    mock_engine.analysis_phase.return_value = {
        "psyops_indicators": {"emotional_manipulation": True},
        "narrative_analysis": mock_engine.detection_phase.return_value
    }
    # Trigger guardrail by including forbidden word
    mock_engine.counter_messaging_generation_phase.return_value = "This contains error_code_red"

    orchestrator = RefinedPsyOpsOrchestrator(mock_engine, mock_postgres)
    input_data = {"content": "test content", "source": "unit-test"}

    # Run
    state = await orchestrator.run_workflow(input_data)

    # Verify
    assert state.status == "FAILED"
    assert any("Guardrail failed" in err for err in state.errors)
    # Ensure obfuscation phase was NOT called
    mock_engine.obfuscation_layers_phase.assert_not_called()

@pytest.mark.asyncio
async def test_workflow_validation_error():
    # Setup mocks
    mock_engine = MagicMock()
    mock_postgres = MagicMock()

    # Return invalid data (missing required field)
    mock_engine.detection_phase.return_value = {
        "intelgraph_narrative_id": "narr-123"
        # missing is_adversarial, sentiment, etc.
    }

    orchestrator = RefinedPsyOpsOrchestrator(mock_engine, mock_postgres)
    input_data = {"content": "test content", "source": "unit-test"}

    # Run
    state = await orchestrator.run_workflow(input_data)

    # Verify
    assert state.status == "FAILED"
    assert any("Contract Validation Error" in err for err in state.errors)
