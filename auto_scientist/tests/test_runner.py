import json
from pathlib import Path
from auto_scientist.telemetry import TelemetryLogger
from auto_scientist.runner import ExperimentRunner
from auto_scientist.graph import ExperimentGraph, Node, NodeType

def test_telemetry_logging(tmp_path):
    log_file = tmp_path / "telemetry.jsonl"
    logger = TelemetryLogger(path=log_file)

    logger.log_event("test_event", {"param": "value", "number": 123})

    assert log_file.exists()

    with log_file.open("r") as f:
        line = f.readline()

    record = json.loads(line)

    assert record["event_type"] == "test_event"
    assert record["payload"]["param"] == "value"
    assert "timestamp" in record

def test_runner_logs_events(tmp_path):
    log_file = tmp_path / "telemetry.jsonl"
    logger = TelemetryLogger(path=log_file)
    graph = ExperimentGraph()

    def dummy_train_fn(config):
        return {"metrics": {"accuracy": 0.99}}

    runner = ExperimentRunner(train_fn=dummy_train_fn, telemetry=logger)
    runner.run_experiment(graph, config={"C": 1.0}, stage="test_stage")

    with log_file.open("r") as f:
        lines = f.readlines()

    assert len(lines) == 2

    start_record = json.loads(lines[0])
    end_record = json.loads(lines[1])

    assert start_record["event_type"] == "run_start"
    assert start_record["payload"]["stage"] == "test_stage"
    assert end_record["event_type"] == "run_end"
    assert end_record["payload"]["result"]["metrics"]["accuracy"] == 0.99
