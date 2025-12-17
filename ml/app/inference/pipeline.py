"""Inference pipeline with batching, quantization, and model caching."""
from __future__ import annotations

import asyncio
import copy
from collections import OrderedDict
from dataclasses import dataclass
from time import perf_counter
from typing import Any, Iterable

import torch

from ..monitoring.metrics import track_cache_operation


@dataclass
class CachedModel:
    """Container for cached inference models."""

    model: torch.nn.Module
    quantized: bool
    device: torch.device


@dataclass
class InferenceResult:
    """Result container returned by the inference pipeline."""

    predictions: list[list[float]]
    confidence_scores: list[float]
    duration_ms: float
    cache_hit: bool


class InferencePipeline:
    """Manage inference-time optimizations such as batching, quantization, and caching."""

    def __init__(self, device: torch.device, cache_size: int = 3):
        self.device = device
        self.cache_size = cache_size
        self._model_cache: OrderedDict[str, CachedModel] = OrderedDict()
        self._cache_lock = asyncio.Lock()

    async def refresh_model(self, model_id: str, model_data: dict[str, Any]) -> None:
        """Replace the cached model for a given identifier."""
        async with self._cache_lock:
            if model_id in self._model_cache:
                self._model_cache.pop(model_id, None)
            prepared_model = self._prepare_model(model_data)
            self._record_cache_entry(model_id, prepared_model)

    async def evict_model(self, model_id: str) -> None:
        """Remove a model from the cache if it exists."""
        async with self._cache_lock:
            if model_id in self._model_cache:
                self._model_cache.pop(model_id, None)

    async def run_inference(
        self,
        model_id: str,
        model_data: dict[str, Any],
        node_features: list[list[float]],
        edge_index: list[list[int]],
        batch_indices: list[int] | None = None,
        requested_batch_size: int | None = None,
    ) -> InferenceResult:
        """
        Execute inference with caching, quantization, and optional batching.
        """

        cached_model, cache_hit = await self._get_or_prepare_model(model_id, model_data)
        model = cached_model.model.to(cached_model.device)
        model.eval()

        x = torch.tensor(node_features, dtype=torch.float32, device=cached_model.device)
        edges = torch.tensor(edge_index, dtype=torch.long, device=cached_model.device)
        batch_tensor = (
            torch.tensor(batch_indices, dtype=torch.long, device=cached_model.device)
            if batch_indices is not None
            else None
        )

        start = perf_counter()
        with torch.no_grad():
            if batch_tensor is not None:
                outputs = self._batched_forward(
                    model, x, edges, batch_tensor, requested_batch_size
                )
            else:
                outputs = model(x, edges)

            probabilities = torch.softmax(outputs, dim=-1)
            confidence_scores = torch.max(probabilities, dim=-1)[0]

        duration_ms = (perf_counter() - start) * 1000

        return InferenceResult(
            predictions=probabilities.cpu().numpy().tolist(),
            confidence_scores=confidence_scores.cpu().numpy().tolist(),
            duration_ms=duration_ms,
            cache_hit=cache_hit,
        )

    async def _get_or_prepare_model(
        self, model_id: str, model_data: dict[str, Any]
    ) -> tuple[CachedModel, bool]:
        async with self._cache_lock:
            cached = self._model_cache.get(model_id)
            if cached:
                self._model_cache.move_to_end(model_id)
                track_cache_operation("model", True)
                return cached, True

            prepared_model = self._prepare_model(model_data)
            self._record_cache_entry(model_id, prepared_model)
            track_cache_operation("model", False)
            return prepared_model, False

    def _prepare_model(self, model_data: dict[str, Any]) -> CachedModel:
        base_model = copy.deepcopy(model_data["model"])
        config = model_data.get("config")
        quantized = False

        use_quantization = self._get_config_flag(config, "use_quantization", False)
        quantization_bits = self._get_config_flag(config, "quantization_bits", 8)
        model_device = self._resolve_model_device(use_quantization, quantization_bits)

        base_model.to(model_device)
        if use_quantization:
            base_model = self._quantize_model(base_model, quantization_bits)
            quantized = True

        return CachedModel(model=base_model, quantized=quantized, device=model_device)

    def _record_cache_entry(self, model_id: str, cached_model: CachedModel) -> None:
        self._model_cache[model_id] = cached_model
        self._model_cache.move_to_end(model_id)

        if len(self._model_cache) > self.cache_size:
            self._model_cache.popitem(last=False)

    def _quantize_model(self, model: torch.nn.Module, bits: int) -> torch.nn.Module:
        if bits == 8:
            return torch.quantization.quantize_dynamic(
                model, {torch.nn.Linear}, dtype=torch.qint8
            )
        if bits == 16:
            return model.half()
        return model

    def _resolve_model_device(self, use_quantization: bool, quantization_bits: int) -> torch.device:
        """Determine the execution device for the cached model."""

        if use_quantization and quantization_bits == 8:
            # Dynamic quantization is only supported on CPU; keep inputs aligned.
            return torch.device("cpu")

        return self.device

    def _get_config_flag(self, config: Any, key: str, default: Any) -> Any:
        if config is None:
            return default
        if hasattr(config, key):
            return getattr(config, key)
        if isinstance(config, dict):
            return config.get(key, default)
        return default

    def _batched_forward(
        self,
        model: torch.nn.Module,
        node_features: torch.Tensor,
        edge_index: torch.Tensor,
        batch_indices: torch.Tensor,
        max_nodes_per_batch: int | None,
    ) -> torch.Tensor:
        unique_batches = torch.unique(batch_indices)
        output_buffer: list[tuple[torch.Tensor, torch.Tensor]] = []

        for batch_id in unique_batches:
            batch_mask = batch_indices == batch_id
            node_positions = torch.nonzero(batch_mask, as_tuple=False).flatten()
            if node_positions.numel() == 0:
                continue

            if max_nodes_per_batch and node_positions.numel() > max_nodes_per_batch:
                output_buffer.extend(
                    self._process_node_chunk(
                        model,
                        node_features,
                        edge_index,
                        node_positions,
                        batch_mask,
                        max_nodes_per_batch,
                    )
                )
            else:
                output_buffer.append(
                    self._run_single_batch(
                        model, node_features, edge_index, node_positions, batch_mask
                    )
                )

        return self._stitch_outputs(output_buffer, node_features.shape[0])

    def _process_node_chunk(
        self,
        model: torch.nn.Module,
        node_features: torch.Tensor,
        edge_index: torch.Tensor,
        node_positions: torch.Tensor,
        batch_mask: torch.Tensor,
        max_nodes_per_batch: int,
    ) -> Iterable[tuple[torch.Tensor, torch.Tensor]]:
        outputs: list[tuple[torch.Tensor, torch.Tensor]] = []
        for chunk in node_positions.split(max_nodes_per_batch):
            chunk_mask = torch.zeros_like(batch_mask)
            chunk_mask[chunk] = True
            outputs.append(
                self._run_single_batch(
                    model, node_features, edge_index, chunk, chunk_mask
                )
            )
        return outputs

    def _run_single_batch(
        self,
        model: torch.nn.Module,
        node_features: torch.Tensor,
        edge_index: torch.Tensor,
        node_positions: torch.Tensor,
        node_mask: torch.Tensor,
    ) -> tuple[torch.Tensor, torch.Tensor]:
        mapping = torch.full(
            (node_features.size(0),), -1, dtype=torch.long, device=node_features.device
        )
        mapping[node_positions] = torch.arange(node_positions.numel(), device=node_features.device)

        edge_mask = node_mask[edge_index[0]] & node_mask[edge_index[1]]
        sub_edge_index = mapping[edge_index[:, edge_mask]]
        sub_features = node_features[node_positions]

        outputs = model(sub_features, sub_edge_index)
        return node_positions, outputs

    def _stitch_outputs(
        self, output_buffer: Iterable[tuple[torch.Tensor, torch.Tensor]], total_nodes: int
    ) -> torch.Tensor:
        stitched = None
        for positions, outputs in output_buffer:
            if stitched is None:
                stitched = torch.zeros(
                    (total_nodes, outputs.size(-1)), device=outputs.device, dtype=outputs.dtype
                )
            stitched[positions] = outputs

        if stitched is None:
            raise RuntimeError("No outputs generated during batched inference")

        return stitched
