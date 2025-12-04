import pytest
from sre.models import Episode
from sre.metrics import TraceLengthMetric, ToolEfficiencyMetric, ExactMatchMetric

@pytest.fixture
def mock_episode():
    return Episode(
        episode_id="test-1",
        task_id="task-1",
        run_config={"expected_answer": "Paris"},
        outcome="Paris",
        graph={
            "nodes": [
                {"id": "n1", "type": "thought", "content": "Thinking about France"},
                {"id": "n2", "type": "call", "content": "search('capital of France')", "metadata": {"tool_name": "search"}},
                {"id": "n3", "type": "call", "content": "lookup('Paris')", "metadata": {"tool_name": "wiki"}},
                {"id": "n4", "type": "observation", "content": "Paris"},
            ],
            "edges": [
                {"source": "n1", "target": "n2"},
                {"source": "n2", "target": "n3"},
                {"source": "n3", "target": "n4"}
            ]
        }
    )

def test_episode_schema_validity(mock_episode):
    assert mock_episode.episode_id == "test-1"
    assert len(mock_episode.graph.nodes) == 4

def test_trace_length_metric(mock_episode):
    metric = TraceLengthMetric()
    score = metric.compute(mock_episode)
    assert score == 4.0

def test_tool_efficiency_metric(mock_episode):
    metric = ToolEfficiencyMetric()
    score = metric.compute(mock_episode)
    # 2 calls, 2 unique tools -> 1.0
    assert score == 1.0

def test_exact_match_metric(mock_episode):
    metric = ExactMatchMetric()
    assert metric.compute(mock_episode) == 1.0

    mock_episode.outcome = "London"
    assert metric.compute(mock_episode) == 0.0
