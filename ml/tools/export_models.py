"""CLI for exporting IntelGraph GNN models to edge-friendly formats."""

from __future__ import annotations

import argparse
import importlib.util
import json
import logging
from pathlib import Path
from typing import Iterable

import torch

from ml.app.edge.conversion import export_model_to_edge_formats


LOGGER = logging.getLogger("ml.tools.export_models")


def _load_gnn_classes():
    module_path = Path(__file__).resolve().parents[1] / "app" / "models" / "gnn_model.py"
    spec = importlib.util.spec_from_file_location("intelgraph_gnn_model", module_path)
    if spec is None or spec.loader is None:  # pragma: no cover - defensive
        raise RuntimeError(f"Unable to load GNN model definitions from {module_path}")
    module = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(module)
        return module.GNNLinkPredictor, module.GNNAnomalyDetector, module.GNNNodeClassifier
    except ModuleNotFoundError as exc:  # pragma: no cover - optional dependency fallback
        LOGGER.warning("torch_geometric not available, using fallback linear models: %s", exc)

        class _FallbackLinkPredictor(torch.nn.Module):
            def __init__(self, num_node_features, hidden_channels):
                super().__init__()
                self.fc1 = torch.nn.Linear(num_node_features, hidden_channels)
                self.fc2 = torch.nn.Linear(hidden_channels, hidden_channels)

            def forward(self, x, _edge_index):
                return self.fc2(torch.relu(self.fc1(x)))

        class _FallbackAnomalyDetector(torch.nn.Module):
            def __init__(self, num_node_features, hidden_channels):
                super().__init__()
                self.backbone = _FallbackLinkPredictor(num_node_features, hidden_channels)
                self.out = torch.nn.Linear(hidden_channels, 1)

            def forward(self, x, edge_index):
                h = self.backbone(x, edge_index)
                return torch.sigmoid(self.out(h))

        class _FallbackNodeClassifier(torch.nn.Module):
            def __init__(self, num_node_features, hidden_channels, num_classes):
                super().__init__()
                self.backbone = _FallbackLinkPredictor(num_node_features, hidden_channels)
                self.classifier = torch.nn.Linear(hidden_channels, num_classes)

            def forward(self, x, edge_index):
                h = self.backbone(x, edge_index)
                return torch.log_softmax(self.classifier(h), dim=1)

        return _FallbackLinkPredictor, _FallbackAnomalyDetector, _FallbackNodeClassifier


GNNLinkPredictor, GNNAnomalyDetector, GNNNodeClassifier = _load_gnn_classes()


MODEL_REGISTRY = {
    "link_predictor": GNNLinkPredictor,
    "anomaly_detector": GNNAnomalyDetector,
    "node_classifier": GNNNodeClassifier,
}


def _build_example_inputs(num_nodes: int, num_node_features: int) -> tuple[torch.Tensor, torch.Tensor]:
    x = torch.randn(num_nodes, num_node_features, dtype=torch.float32)
    if num_nodes < 2:
        edge_index = torch.zeros((2, 1), dtype=torch.long)
    else:
        source = torch.arange(0, num_nodes - 1, dtype=torch.long)
        target = torch.arange(1, num_nodes, dtype=torch.long)
        edge_index = torch.stack([source, target])
    return x, edge_index


def _load_model(model_name: str, hidden_channels: int, num_node_features: int, num_classes: int) -> torch.nn.Module:
    if model_name not in MODEL_REGISTRY:
        raise SystemExit(f"Unknown model type '{model_name}'. Options: {', '.join(MODEL_REGISTRY)}")

    model_cls = MODEL_REGISTRY[model_name]
    if model_name == "node_classifier":
        model = model_cls(num_node_features, hidden_channels, num_classes)
    else:
        model = model_cls(num_node_features, hidden_channels)
    return model


def _maybe_load_checkpoint(model: torch.nn.Module, checkpoint: Path) -> None:
    if not checkpoint:
        return
    checkpoint = checkpoint.expanduser().resolve()
    if not checkpoint.exists():
        raise SystemExit(f"Checkpoint not found: {checkpoint}")

    LOGGER.info("Loading checkpoint from %s", checkpoint)
    state = torch.load(str(checkpoint), map_location="cpu")
    if isinstance(state, dict) and "state_dict" in state:
        state = state["state_dict"]
    model.load_state_dict(state)


def export_model(
    *,
    model_type: str,
    hidden_channels: int,
    num_node_features: int,
    num_classes: int,
    num_nodes: int,
    formats: Iterable[str],
    output_dir: Path,
    export_name: str,
    checkpoint: Path | None,
    quantization: str | None,
) -> list[dict[str, object]]:
    model = _load_model(model_type, hidden_channels, num_node_features, num_classes)
    _maybe_load_checkpoint(model, checkpoint if checkpoint else None)

    example_inputs = _build_example_inputs(num_nodes, num_node_features)
    try:
        artifacts = export_model_to_edge_formats(
            model,
            example_inputs,
            output_dir,
            export_name,
            formats,
            dynamic_axes={"input_0": {0: "nodes"}, "input_1": {1: "edges"}},
            quantization=quantization,
        )
    except (ModuleNotFoundError, RuntimeError, torch.onnx.OnnxExporterError) as exc:
        LOGGER.error("Export failed due to missing optional dependency: %s", exc)
        raise SystemExit("Install onnx/onnxruntime to export in the requested format") from exc

    return [artifact.to_dict() for artifact in artifacts]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("model_type", choices=sorted(MODEL_REGISTRY.keys()))
    parser.add_argument("output", type=Path, help="Directory where exported artifacts will be stored")
    parser.add_argument("--export-name", default="intelgraph_gnn", help="Base filename for exported artifacts")
    parser.add_argument("--hidden-channels", type=int, default=128)
    parser.add_argument("--num-node-features", type=int, default=64)
    parser.add_argument("--num-classes", type=int, default=3)
    parser.add_argument("--num-nodes", type=int, default=8)
    parser.add_argument("--formats", nargs="+", default=["onnx"], help="Target formats (onnx, tflite)")
    parser.add_argument("--checkpoint", type=Path, help="Optional checkpoint (state_dict or TorchScript)")
    parser.add_argument("--quantization", choices=["int8", "uint8", "float16"], help="Apply post-export quantization")
    parser.add_argument("--verbose", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO)

    artifacts = export_model(
        model_type=args.model_type,
        hidden_channels=args.hidden_channels,
        num_node_features=args.num_node_features,
        num_classes=args.num_classes,
        num_nodes=args.num_nodes,
        formats=args.formats,
        output_dir=args.output,
        export_name=args.export_name,
        checkpoint=args.checkpoint,
        quantization=args.quantization,
    )

    print(json.dumps({"artifacts": artifacts}, indent=2))


if __name__ == "__main__":
    main()
