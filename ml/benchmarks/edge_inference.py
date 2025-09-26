"""Benchmark utilities comparing cloud vs. edge inference latency."""

from __future__ import annotations

import importlib.util
import statistics
import tempfile
import time
from pathlib import Path
from typing import Dict, Tuple

import torch

from ml.app.edge.conversion import export_model_to_edge_formats


def _load_gnn_link_predictor():
    module_path = Path(__file__).resolve().parents[1] / "app" / "models" / "gnn_model.py"
    spec = importlib.util.spec_from_file_location("intelgraph_gnn_model", module_path)
    if spec is None or spec.loader is None:  # pragma: no cover
        raise RuntimeError(f"Unable to load GNN definitions from {module_path}")
    module = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(module)
        return module.GNNLinkPredictor
    except ModuleNotFoundError:
        class _Fallback(torch.nn.Module):
            def __init__(self, num_node_features, hidden_channels):
                super().__init__()
                self.fc1 = torch.nn.Linear(num_node_features, hidden_channels)
                self.fc2 = torch.nn.Linear(hidden_channels, hidden_channels)

            def forward(self, x, _edge_index):
                return self.fc2(torch.relu(self.fc1(x)))

        return _Fallback


GNNLinkPredictor = _load_gnn_link_predictor()


def _synthesize_graph(num_nodes: int, num_features: int) -> Tuple[torch.Tensor, torch.Tensor]:
    x = torch.randn(num_nodes, num_features, dtype=torch.float32)
    source = torch.arange(0, num_nodes - 1, dtype=torch.long)
    target = torch.arange(1, num_nodes, dtype=torch.long)
    edge_index = torch.stack([source, target]) if len(source) else torch.zeros((2, 1), dtype=torch.long)
    return x, edge_index


def _time_pytorch(model: torch.nn.Module, inputs: Tuple[torch.Tensor, torch.Tensor], runs: int) -> float:
    model.eval()
    try:
        device = next(model.parameters()).device
    except StopIteration:
        device = torch.device('cpu')
    inputs = tuple(t.to(device) for t in inputs)

    with torch.no_grad():
        for _ in range(5):
            model(*inputs)

        measurements = []
        for _ in range(runs):
            start = time.perf_counter()
            model(*inputs)
            if device.type == 'cuda':
                torch.cuda.synchronize()
            end = time.perf_counter()
            measurements.append((end - start) * 1000.0)

    return statistics.mean(measurements)


def _time_onnx(model_path: Path, inputs: Tuple[torch.Tensor, torch.Tensor], runs: int) -> float | None:
    try:
        import onnxruntime as ort
    except Exception:  # pragma: no cover - optional dependency
        return None

    session = ort.InferenceSession(str(model_path), providers=['CPUExecutionProvider'])
    input_feed = {
        session.get_inputs()[0].name: inputs[0].numpy(),
        session.get_inputs()[1].name: inputs[1].numpy(),
    }

    for _ in range(5):
        session.run(None, input_feed)

    measurements = []
    for _ in range(runs):
        start = time.perf_counter()
        session.run(None, input_feed)
        end = time.perf_counter()
        measurements.append((end - start) * 1000.0)

    return statistics.mean(measurements)


def benchmark_edge_inference(
    num_nodes: int = 128,
    num_features: int = 64,
    hidden_channels: int = 128,
    runs: int = 25,
) -> Dict[str, float | None]:
    """Run inference latency benchmarks for PyTorch vs. ONNX edge runtime."""

    model = GNNLinkPredictor(num_features, hidden_channels)
    inputs = _synthesize_graph(num_nodes, num_features)

    results: Dict[str, float | None] = {}
    results['pytorch_ms'] = _time_pytorch(model, inputs, runs)

    with tempfile.TemporaryDirectory() as tmpdir:
        try:
            artifacts = export_model_to_edge_formats(
                model.to('cpu'),
                inputs,
                Path(tmpdir),
                'gnn_edge',
                ['onnx'],
                dynamic_axes={"input_0": {0: "nodes"}, "input_1": {1: "edges"}},
            )
        except (ModuleNotFoundError, RuntimeError, torch.onnx.OnnxExporterError):  # pragma: no cover - optional deps
            results['onnx_cpu_ms'] = None
        else:
            onnx_artifact = next((artifact for artifact in artifacts if artifact.format == 'onnx'), None)
            if onnx_artifact:
                results['onnx_cpu_ms'] = _time_onnx(onnx_artifact.path, inputs, runs)
            else:
                results['onnx_cpu_ms'] = None

    if results.get('pytorch_ms') is not None and results.get('onnx_cpu_ms') is not None:
        results['speedup_factor'] = results['pytorch_ms'] / results['onnx_cpu_ms']
    else:
        results['speedup_factor'] = None

    return results


__all__ = ['benchmark_edge_inference']
