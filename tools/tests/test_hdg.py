from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

from tools.hdg.determinism import deterministic_run, hash_training_graph
from tools.hdg.receipt import ReceiptEmitter
from tools.hdg.scanner import VarianceScanner


def deterministic_callable():
    return {"value": 42}


def test_receipt_emission(tmp_path: Path):
    graph_description = {"layers": ["linear", "relu"]}
    with deterministic_run(seed=123) as state:
        emitter = ReceiptEmitter(state, graph=graph_description, extra={"run": "unit-test"})
        receipt = emitter.build()
        target = tmp_path / "receipt.json"
        emitter.write(target)

    payload = json.loads(target.read_text())
    assert payload["graph_hash"] == hash_training_graph(graph_description)
    assert payload["extra"]["run"] == "unit-test"
    assert payload["frameworks"]["seed"]["python"] is True


def test_variance_scanner_flags_nondeterministic(monkeypatch):
    scanner = VarianceScanner("tools.tests.test_hdg:deterministic_callable")

    def fake_execute(self):
        return deterministic_callable(), ["aten::dropout", "aten::matmul"]

    monkeypatch.setattr(VarianceScanner, "_execute_with_trace", fake_execute)
    result = scanner.run(runs=2)
    assert "aten::dropout" in result.nondeterministic_ops
    assert result.identical is True


@pytest.mark.skipif(sys.platform.startswith("win"), reason="Subprocess invocation differs on Windows")
def test_cli_receipt(tmp_path: Path):
    output = tmp_path / "receipt.json"
    graph = tmp_path / "graph.json"
    graph.write_text(json.dumps({"graph": "demo"}))

    cmd = [
        sys.executable,
        "-m",
        "tools.hdg",
        "receipt",
        "--seed",
        "7",
        "--output",
        str(output),
        "--graph",
        str(graph),
    ]
    subprocess.run(cmd, check=True)

    payload = json.loads(output.read_text())
    assert payload["graph_hash"] == hash_training_graph(graph.read_bytes())
