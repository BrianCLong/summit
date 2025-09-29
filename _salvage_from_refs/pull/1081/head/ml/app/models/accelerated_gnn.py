import logging
import time
from contextlib import contextmanager

import bitsandbytes as bnb
import psutil
import pynvml
import torch
import torch.nn.functional as F
from accelerate import Accelerator
from torch_geometric.data import Data
from torch_geometric.nn import GATConv, GCNConv, SAGEConv

logger = logging.getLogger(__name__)


class GPUAcceleratedGNN(torch.nn.Module):
    """
    GPU-accelerated Graph Neural Network with support for:
    - Multiple architectures (GCN, GraphSAGE, GAT)
    - Model quantization (INT8/FP16)
    - Mixed precision training
    - Memory optimization
    - Performance monitoring
    """

    def __init__(
        self,
        num_node_features: int,
        hidden_channels: int,
        num_classes: int,
        architecture: str = "gcn",
        num_layers: int = 2,
        dropout: float = 0.1,
        use_quantization: bool = False,
        quantization_bits: int = 8,
        heads: int = 8,  # For GAT
        **kwargs,
    ):
        super().__init__()

        self.num_node_features = num_node_features
        self.hidden_channels = hidden_channels
        self.num_classes = num_classes
        self.architecture = architecture
        self.num_layers = num_layers
        self.dropout = dropout
        self.use_quantization = use_quantization
        self.quantization_bits = quantization_bits

        # Initialize GPU monitoring
        try:
            pynvml.nvmlInit()
            self.gpu_monitoring = True
        except:
            self.gpu_monitoring = False
            logger.warning("GPU monitoring not available")

        # Build the model architecture
        self.convs = torch.nn.ModuleList()
        self.norms = torch.nn.ModuleList()

        # Input layer
        if architecture.lower() == "gcn":
            self.convs.append(GCNConv(num_node_features, hidden_channels))
        elif architecture.lower() == "sage":
            self.convs.append(SAGEConv(num_node_features, hidden_channels))
        elif architecture.lower() == "gat":
            self.convs.append(GATConv(num_node_features, hidden_channels // heads, heads=heads))
        else:
            raise ValueError(f"Unsupported architecture: {architecture}")

        self.norms.append(torch.nn.BatchNorm1d(hidden_channels))

        # Hidden layers
        for _ in range(num_layers - 2):
            if architecture.lower() == "gcn":
                self.convs.append(GCNConv(hidden_channels, hidden_channels))
            elif architecture.lower() == "sage":
                self.convs.append(SAGEConv(hidden_channels, hidden_channels))
            elif architecture.lower() == "gat":
                self.convs.append(GATConv(hidden_channels, hidden_channels // heads, heads=heads))
            self.norms.append(torch.nn.BatchNorm1d(hidden_channels))

        # Output layer
        if num_layers > 1:
            if architecture.lower() == "gcn":
                self.convs.append(GCNConv(hidden_channels, num_classes))
            elif architecture.lower() == "sage":
                self.convs.append(SAGEConv(hidden_channels, num_classes))
            elif architecture.lower() == "gat":
                self.convs.append(GATConv(hidden_channels, num_classes, heads=1))

        self.dropout_layer = torch.nn.Dropout(dropout)

        # Apply quantization if requested
        if use_quantization:
            self._apply_quantization()

    def _apply_quantization(self):
        """Apply model quantization using bitsandbytes"""
        if self.quantization_bits == 8:
            for module in self.modules():
                if isinstance(module, torch.nn.Linear):
                    # Replace Linear layers with quantized versions
                    quantized_linear = bnb.nn.Linear8bitLt(
                        module.in_features,
                        module.out_features,
                        bias=module.bias is not None,
                        has_fp16_weights=False,
                    )
                    module.__class__ = quantized_linear.__class__
                    module.__dict__.update(quantized_linear.__dict__)

        logger.info(f"Applied {self.quantization_bits}-bit quantization")

    @contextmanager
    def monitor_gpu_usage(self):
        """Context manager for GPU memory monitoring"""
        if not self.gpu_monitoring:
            yield {}
            return

        try:
            handle = pynvml.nvmlDeviceGetHandleByIndex(0)
            mem_info_start = pynvml.nvmlDeviceGetMemoryInfo(handle)
            gpu_util_start = pynvml.nvmlDeviceGetUtilizationRates(handle)
            start_time = time.time()

            yield {
                "gpu_memory_used_start": mem_info_start.used,
                "gpu_memory_total": mem_info_start.total,
                "gpu_utilization_start": gpu_util_start.gpu,
            }

            mem_info_end = pynvml.nvmlDeviceGetMemoryInfo(handle)
            gpu_util_end = pynvml.nvmlDeviceGetUtilizationRates(handle)
            end_time = time.time()

            logger.info(
                f"GPU Usage - Memory: {mem_info_end.used / 1024**3:.2f}GB/"
                f"{mem_info_end.total / 1024**3:.2f}GB, "
                f"Utilization: {gpu_util_end.gpu}%, "
                f"Duration: {end_time - start_time:.2f}s"
            )
        except Exception as e:
            logger.warning(f"GPU monitoring failed: {e}")
            yield {}

    def forward(
        self, x: torch.Tensor, edge_index: torch.Tensor, batch: torch.Tensor | None = None
    ) -> torch.Tensor:
        """
        Forward pass with performance monitoring
        """
        with self.monitor_gpu_usage():
            # Apply convolutions
            for i, (conv, norm) in enumerate(zip(self.convs[:-1], self.norms, strict=False)):
                x = conv(x, edge_index)
                x = norm(x)
                x = F.relu(x)
                x = self.dropout_layer(x)

            # Final layer
            if len(self.convs) > 1:
                x = self.convs[-1](x, edge_index)

            return x

    @torch.jit.script_method
    def forward_optimized(self, x: torch.Tensor, edge_index: torch.Tensor) -> torch.Tensor:
        """TorchScript optimized forward pass for inference"""
        for i in range(len(self.convs) - 1):
            x = self.convs[i](x, edge_index)
            x = self.norms[i](x)
            x = F.relu(x)
            x = F.dropout(x, self.dropout, training=False)

        if len(self.convs) > 1:
            x = self.convs[-1](x, edge_index)

        return x

    def get_memory_usage(self) -> dict[str, float]:
        """Get current memory usage statistics"""
        stats = {
            "cpu_memory_gb": psutil.Process().memory_info().rss / 1024**3,
            "cpu_percent": psutil.cpu_percent(),
        }

        if torch.cuda.is_available():
            stats.update(
                {
                    "gpu_memory_allocated_gb": torch.cuda.memory_allocated() / 1024**3,
                    "gpu_memory_reserved_gb": torch.cuda.memory_reserved() / 1024**3,
                    "gpu_memory_max_allocated_gb": torch.cuda.max_memory_allocated() / 1024**3,
                }
            )

        return stats


class DistributedGNNTrainer:
    """
    Distributed training manager for GNN models with GPU acceleration
    """

    def __init__(
        self,
        model: GPUAcceleratedGNN,
        use_mixed_precision: bool = True,
        gradient_accumulation_steps: int = 1,
        **accelerator_kwargs,
    ):
        self.accelerator = Accelerator(
            mixed_precision="fp16" if use_mixed_precision else None,
            gradient_accumulation_steps=gradient_accumulation_steps,
            **accelerator_kwargs,
        )

        self.model = model
        self.device = self.accelerator.device

        # Move model to device
        self.model = self.accelerator.prepare_model(self.model)

        logger.info(f"Initialized distributed trainer on device: {self.device}")
        logger.info(f"Mixed precision: {use_mixed_precision}")
        logger.info(f"Gradient accumulation steps: {gradient_accumulation_steps}")

    def train_step(
        self, data: Data, optimizer: torch.optim.Optimizer, criterion: torch.nn.Module
    ) -> dict[str, float]:
        """Single training step with gradient accumulation and mixed precision"""

        self.model.train()

        with self.accelerator.accumulate(self.model):
            # Forward pass
            out = self.model(data.x, data.edge_index, data.batch)

            # Compute loss
            if hasattr(data, "y"):
                loss = criterion(out, data.y)
            else:
                # For unsupervised tasks, implement reconstruction loss
                loss = F.mse_loss(out, data.x)

            # Backward pass
            self.accelerator.backward(loss)

            # Optimizer step
            optimizer.step()
            optimizer.zero_grad()

        # Gather metrics across devices
        loss_tensor = torch.tensor(loss.item(), device=self.device)
        gathered_loss = self.accelerator.gather(loss_tensor)
        avg_loss = gathered_loss.mean().item()

        return {"loss": avg_loss, "lr": optimizer.param_groups[0]["lr"]}

    @torch.no_grad()
    def evaluate(self, data: Data, criterion: torch.nn.Module) -> dict[str, float]:
        """Evaluation step"""
        self.model.eval()

        out = self.model(data.x, data.edge_index, data.batch)

        if hasattr(data, "y"):
            loss = criterion(out, data.y)

            # Calculate accuracy for classification
            if data.y.dim() == 1:  # Single-label classification
                pred = out.argmax(dim=-1)
                acc = (pred == data.y).float().mean()
            else:  # Multi-label or regression
                acc = F.cosine_similarity(out, data.y, dim=-1).mean()
        else:
            loss = F.mse_loss(out, data.x)
            acc = torch.tensor(0.0, device=self.device)

        # Gather metrics
        loss_tensor = torch.tensor(loss.item(), device=self.device)
        acc_tensor = torch.tensor(acc.item(), device=self.device)

        gathered_loss = self.accelerator.gather(loss_tensor).mean()
        gathered_acc = self.accelerator.gather(acc_tensor).mean()

        return {"eval_loss": gathered_loss.item(), "eval_accuracy": gathered_acc.item()}

    def save_model(self, path: str):
        """Save model with accelerator state"""
        unwrapped_model = self.accelerator.unwrap_model(self.model)
        torch.save(unwrapped_model.state_dict(), path)
        logger.info(f"Model saved to {path}")

    def load_model(self, path: str):
        """Load model state"""
        unwrapped_model = self.accelerator.unwrap_model(self.model)
        unwrapped_model.load_state_dict(torch.load(path, map_location=self.device))
        logger.info(f"Model loaded from {path}")


class ModelOptimizer:
    """
    Model optimization utilities for deployment
    """

    @staticmethod
    def compile_for_inference(
        model: GPUAcceleratedGNN, example_input: tuple
    ) -> torch.jit.ScriptModule:
        """Compile model for optimized inference using TorchScript"""
        model.eval()

        with torch.no_grad():
            traced_model = torch.jit.trace(model, example_input)

        # Optimize for inference
        traced_model = torch.jit.optimize_for_inference(traced_model)

        logger.info("Model compiled for optimized inference")
        return traced_model

    @staticmethod
    def apply_tensorrt_optimization(
        model: torch.jit.ScriptModule, example_input: tuple, precision: str = "fp16"
    ) -> torch.jit.ScriptModule:
        """Apply TensorRT optimization (requires tensorrt installation)"""
        try:
            import torch_tensorrt

            compiled_model = torch_tensorrt.compile(
                model,
                inputs=[example_input],
                enabled_precisions={torch.half if precision == "fp16" else torch.float},
            )

            logger.info(f"TensorRT optimization applied with {precision} precision")
            return compiled_model
        except ImportError:
            logger.warning("TensorRT not available, skipping optimization")
            return model

    @staticmethod
    def benchmark_model(
        model: GPUAcceleratedGNN | torch.jit.ScriptModule, example_input: tuple, num_runs: int = 100
    ) -> dict[str, float]:
        """Benchmark model performance"""
        model.eval()
        device = next(model.parameters()).device

        # Warmup
        with torch.no_grad():
            for _ in range(10):
                _ = model(*example_input)

        torch.cuda.synchronize() if device.type == "cuda" else None

        # Benchmark
        start_time = time.time()
        with torch.no_grad():
            for _ in range(num_runs):
                _ = model(*example_input)

        torch.cuda.synchronize() if device.type == "cuda" else None
        end_time = time.time()

        avg_time = (end_time - start_time) / num_runs
        throughput = 1.0 / avg_time

        return {
            "avg_inference_time_ms": avg_time * 1000,
            "throughput_samples_per_sec": throughput,
            "device": str(device),
        }
