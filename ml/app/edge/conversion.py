"""Utilities for exporting IntelGraph models to edge-friendly formats."""

from __future__ import annotations

import json
import logging
import shutil
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable, Optional, Sequence

import torch

LOGGER = logging.getLogger(__name__)


@dataclass
class EdgeExportArtifact:
    """Metadata describing a converted model artifact."""

    format: str
    path: Path
    size_bytes: int
    created_at: datetime
    metadata: dict[str, object]

    def to_dict(self) -> dict[str, object]:
        payload = asdict(self)
        payload["path"] = str(self.path)
        payload["created_at"] = self.created_at.isoformat()
        payload["metadata"] = json.loads(json.dumps(payload["metadata"]))
        return payload


class ExportError(RuntimeError):
    """Raised when a conversion step fails."""


def _ensure_example_inputs(example_inputs: Sequence[torch.Tensor]) -> tuple[torch.Tensor, ...]:
    if not example_inputs:
        raise ExportError("At least one example input tensor is required for export")
    normalized = []
    for tensor in example_inputs:
        if not isinstance(tensor, torch.Tensor):
            raise ExportError("Example inputs must be torch.Tensor instances")
        normalized.append(tensor.detach())
    return tuple(normalized)


def _export_to_onnx(
    model: torch.nn.Module,
    example_inputs: Sequence[torch.Tensor],
    export_path: Path,
    *,
    opset: int = 17,
    dynamic_axes: Optional[dict[str, dict[int, str]]] = None,
) -> EdgeExportArtifact:
    LOGGER.info("Exporting model to ONNX at %s", export_path)
    export_path.parent.mkdir(parents=True, exist_ok=True)

    normalized_inputs = _ensure_example_inputs(example_inputs)
    input_names = [f"input_{idx}" for idx in range(len(normalized_inputs))]
    output_names = ["output"]

    torch.onnx.export(
        model,
        normalized_inputs,
        str(export_path),
        export_params=True,
        opset_version=opset,
        input_names=input_names,
        output_names=output_names,
        dynamic_axes=dynamic_axes,
    )

    size_bytes = export_path.stat().st_size
    LOGGER.info("ONNX export complete (size=%s bytes)", size_bytes)
    return EdgeExportArtifact(
        format="onnx",
        path=export_path,
        size_bytes=size_bytes,
        created_at=datetime.utcnow(),
        metadata={"opset": opset, "inputs": input_names, "outputs": output_names},
    )


def _quantize_onnx_model(
    source_path: Path,
    target_suffix: str,
    weight_type: str,
) -> Optional[EdgeExportArtifact]:
    try:
        from onnxruntime.quantization import QuantType, quantize_dynamic
    except Exception as exc:  # pragma: no cover - optional dependency
        LOGGER.warning("onnxruntime.quantization not available: %s", exc)
        return None

    quant_types = {
        "int8": QuantType.QInt8,
        "qint8": QuantType.QInt8,
        "uint8": QuantType.QUInt8,
        "quint8": QuantType.QUInt8,
        "float16": QuantType.QFloat16,
    }
    quant_type = quant_types.get(weight_type.lower())
    if quant_type is None:
        LOGGER.warning("Unsupported ONNX quantization weight type: %s", weight_type)
        return None

    target_path = source_path.with_suffix(target_suffix)
    LOGGER.info("Applying ONNX dynamic quantization (%s) -> %s", weight_type, target_path)
    quantize_dynamic(str(source_path), str(target_path), weight_type=quant_type)

    return EdgeExportArtifact(
        format=f"onnx-{weight_type.lower()}",
        path=target_path,
        size_bytes=target_path.stat().st_size,
        created_at=datetime.utcnow(),
        metadata={"quantized_from": str(source_path)},
    )


def _export_to_tflite(
    onnx_path: Path,
    export_path: Path,
    *,
    quantization: Optional[str] = None,
) -> Optional[EdgeExportArtifact]:
    try:
        import onnx
        from onnx_tf.backend import prepare
        import tensorflow as tf
    except Exception as exc:  # pragma: no cover - optional dependency
        LOGGER.warning("TensorFlow Lite export skipped: %s", exc)
        return None

    LOGGER.info("Converting ONNX graph to TensorFlow SavedModel for TFLite export")
    tf_workdir = export_path.parent / f".{export_path.stem}_tf"
    if tf_workdir.exists():
        shutil.rmtree(tf_workdir)

    onnx_model = onnx.load(str(onnx_path))
    tf_rep = prepare(onnx_model)
    tf_rep.export_graph(str(tf_workdir))

    converter = tf.lite.TFLiteConverter.from_saved_model(str(tf_workdir))
    if quantization:
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        if quantization.lower() == "float16":
            converter.target_spec.supported_types = [tf.float16]

    tflite_model = converter.convert()
    export_path.parent.mkdir(parents=True, exist_ok=True)
    export_path.write_bytes(tflite_model)

    shutil.rmtree(tf_workdir, ignore_errors=True)

    LOGGER.info("Generated TFLite model at %s", export_path)
    return EdgeExportArtifact(
        format="tflite",
        path=export_path,
        size_bytes=export_path.stat().st_size,
        created_at=datetime.utcnow(),
        metadata={"quantization": quantization or "none", "source": str(onnx_path)},
    )


def export_model_to_edge_formats(
    model: torch.nn.Module,
    example_inputs: Sequence[torch.Tensor],
    export_dir: Path,
    export_name: str,
    formats: Iterable[str],
    *,
    opset: int = 17,
    dynamic_axes: Optional[dict[str, dict[int, str]]] = None,
    quantization: Optional[str] = None,
) -> list[EdgeExportArtifact]:
    """Convert a model into the requested edge deployment formats."""

    model = model.eval()
    export_dir = Path(export_dir)
    export_dir.mkdir(parents=True, exist_ok=True)

    requested = {fmt.lower() for fmt in formats}
    if not requested:
        raise ExportError("At least one export format must be provided")

    artifacts: list[EdgeExportArtifact] = []
    onnx_artifact: Optional[EdgeExportArtifact] = None

    if "onnx" in requested or "tflite" in requested:
        onnx_path = export_dir / f"{export_name}.onnx"
        onnx_artifact = _export_to_onnx(
            model,
            example_inputs,
            onnx_path,
            opset=opset,
            dynamic_axes=dynamic_axes,
        )
        artifacts.append(onnx_artifact)

        if quantization and onnx_artifact:
            quantized = _quantize_onnx_model(onnx_artifact.path, ".quant.onnx", quantization)
            if quantized:
                artifacts.append(quantized)

    if "tflite" in requested and onnx_artifact:
        tflite_path = export_dir / f"{export_name}.tflite"
        tflite_artifact = _export_to_tflite(onnx_artifact.path, tflite_path, quantization=quantization)
        if tflite_artifact:
            artifacts.append(tflite_artifact)

    return artifacts


__all__ = [
    "EdgeExportArtifact",
    "ExportError",
    "export_model_to_edge_formats",
]

