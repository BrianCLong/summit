"""Tests for the optimized inference pipeline."""

import sys
import time
import types

import pytest
import torch

# The monitoring stack pulls in psutil; provide a minimal stub so the pipeline
# can be imported in lightweight CI environments without the dependency.
if "psutil" not in sys.modules:
    _start = time.time()

    class _FakeProcess:
        def __init__(self):
            self.pid = 1

        def create_time(self) -> float:
            return _start

    sys.modules["psutil"] = types.SimpleNamespace(
        virtual_memory=lambda: types.SimpleNamespace(percent=0.0),
        cpu_percent=lambda interval=None: 0.0,
        cpu_count=lambda logical=True: 1,
        disk_usage=lambda path=None: types.SimpleNamespace(percent=0.0),
        Process=_FakeProcess,
    )

if "neo4j" not in sys.modules:
    class _FakeDriver:
        def close(self):
            return None

    class _FakeGraphDatabase:
        @staticmethod
        def driver(_uri, auth=None):
            return _FakeDriver()

    sys.modules["neo4j"] = types.SimpleNamespace(GraphDatabase=_FakeGraphDatabase)

if "prometheus_client" not in sys.modules:
    class _Counter:
        def __init__(self, *_, **__):
            self._value = 0

        def inc(self, value: float = 1.0):
            self._value += value

        def labels(self, **kwargs):  # noqa: ARG002
            return self

    class _Histogram(_Counter):
        def observe(self, value: float):
            self.inc(value)

    class _Gauge(_Counter):
        pass

    class _CollectorRegistry:
        pass

    def _generate_latest(_registry=None):  # noqa: ARG001
        return b""

    sys.modules["prometheus_client"] = types.SimpleNamespace(
        Counter=_Counter,
        Histogram=_Histogram,
        Gauge=_Gauge,
        CollectorRegistry=_CollectorRegistry,
        generate_latest=_generate_latest,
        CONTENT_TYPE_LATEST="text/plain",
    )

from ml.app.inference.pipeline import InferencePipeline


class _TinyModel(torch.nn.Module):
    def __init__(self, output_dim: int = 2):
        super().__init__()
        self.linear = torch.nn.Linear(4, output_dim)

    def forward(self, x: torch.Tensor, edge_index: torch.Tensor) -> torch.Tensor:
        # Ignore edges for this lightweight test model
        return self.linear(x)


@pytest.mark.asyncio
async def test_model_cache_and_quantization():
    model = _TinyModel()
    pipeline = InferencePipeline(torch.device("cpu"), cache_size=1)
    model_data = {
        "model": model,
        "config": {"use_quantization": True, "quantization_bits": 8},
    }

    features = [[0.1, 0.1, 0.1, 0.1], [0.2, 0.2, 0.2, 0.2]]
    edges = [[0, 1], [1, 0]]

    first = await pipeline.run_inference("model-a", model_data, features, edges)
    second = await pipeline.run_inference("model-a", model_data, features, edges)

    assert first.cache_hit is False
    assert second.cache_hit is True

    cached_model = pipeline._model_cache["model-a"].model
    assert any(
        isinstance(mod, torch.nn.quantized.dynamic.Linear) for mod in cached_model.modules()
    )


@pytest.mark.asyncio
async def test_batched_inference_respects_ordering():
    model = _TinyModel(output_dim=3)
    pipeline = InferencePipeline(torch.device("cpu"), cache_size=2)
    model_data = {"model": model, "config": {"use_quantization": False}}

    features = [
        [1.0, 0.0, 0.0, 0.0],
        [0.0, 1.0, 0.0, 0.0],
        [0.0, 0.0, 1.0, 0.0],
        [0.0, 0.0, 0.0, 1.0],
    ]
    edges = [[0, 1, 2, 3], [0, 1, 2, 3]]
    batch_indices = [0, 0, 1, 1]

    batched = await pipeline.run_inference(
        "model-b",
        model_data,
        features,
        edges,
        batch_indices=batch_indices,
        requested_batch_size=1,
    )

    assert len(batched.predictions) == len(features)
    assert all(len(pred) == 3 for pred in batched.predictions)
    assert batched.cache_hit is False


@pytest.mark.asyncio
async def test_quantized_models_fall_back_to_cpu_device():
    """Dynamic quantization should remain on CPU even if the pipeline default is CUDA."""

    model = _TinyModel()
    pipeline = InferencePipeline(torch.device("cuda"), cache_size=1)
    model_data = {
        "model": model,
        "config": {"use_quantization": True, "quantization_bits": 8},
    }

    features = [[0.5, 0.5, 0.5, 0.5]]
    edges = [[0], [0]]

    result = await pipeline.run_inference("model-c", model_data, features, edges)

    cached_entry = pipeline._model_cache["model-c"]
    assert cached_entry.device == torch.device("cpu")
    assert len(result.predictions) == 1
