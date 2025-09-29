import logging
import time
from collections.abc import Callable
from contextlib import contextmanager
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import psutil
import pynvml
import torch
import torch.multiprocessing as mp
from accelerate import Accelerator, DistributedDataParallelKwargs
from torch.utils.data.distributed import DistributedSampler
from torch_geometric.data import Batch, Data, DataLoader

logger = logging.getLogger(__name__)


@dataclass
class TrainingConfig:
    """Configuration for distributed training"""

    # Model parameters
    model_name: str = "accelerated_gnn"
    num_node_features: int = 128
    hidden_channels: int = 256
    num_classes: int = 10
    architecture: str = "gcn"

    # Training parameters
    batch_size: int = 32
    learning_rate: float = 0.001
    num_epochs: int = 100
    gradient_accumulation_steps: int = 1
    max_grad_norm: float = 1.0

    # Distributed training
    world_size: int = 1
    backend: str = "nccl"  # nccl for GPU, gloo for CPU
    find_unused_parameters: bool = False

    # Mixed precision
    use_mixed_precision: bool = True
    precision: str = "fp16"  # fp16, bf16, fp32

    # Optimization
    optimizer: str = "adamw"
    scheduler: str = "cosine"
    warmup_steps: int = 1000
    weight_decay: float = 0.01

    # Checkpointing
    save_every_n_epochs: int = 10
    checkpoint_dir: str = "./checkpoints"
    keep_last_n_checkpoints: int = 3

    # Monitoring
    log_every_n_steps: int = 100
    eval_every_n_epochs: int = 5
    use_wandb: bool = False

    # Hardware optimization
    use_compile: bool = True  # PyTorch 2.0 compile
    dataloader_num_workers: int = 4
    pin_memory: bool = True

    # DeepSpeed integration
    use_deepspeed: bool = False
    deepspeed_config: dict | None = field(
        default_factory=lambda: {
            "train_batch_size": 32,
            "gradient_accumulation_steps": 1,
            "fp16": {"enabled": True},
            "zero_optimization": {
                "stage": 2,
                "allgather_partitions": True,
                "allgather_bucket_size": 2e8,
                "overlap_comm": True,
                "reduce_scatter": True,
                "reduce_bucket_size": 2e8,
                "contiguous_gradients": True,
            },
            "optimizer": {
                "type": "AdamW",
                "params": {"lr": 0.001, "betas": [0.9, 0.999], "eps": 1e-8, "weight_decay": 0.01},
            },
            "scheduler": {
                "type": "WarmupLR",
                "params": {"warmup_min_lr": 0, "warmup_max_lr": 0.001, "warmup_num_steps": 1000},
            },
        }
    )


class DistributedTrainingManager:
    """
    Manager for distributed training across multiple GPUs and nodes
    """

    def __init__(self, config: TrainingConfig):
        self.config = config
        self.accelerator = None
        self.model = None
        self.optimizer = None
        self.scheduler = None
        self.train_dataloader = None
        self.eval_dataloader = None

        # Initialize monitoring
        self._init_monitoring()

        # Setup distributed environment
        self._setup_distributed()

        logger.info("Distributed Training Manager initialized")
        logger.info(f"World size: {self.config.world_size}")
        logger.info(f"Backend: {self.config.backend}")

    def _init_monitoring(self):
        """Initialize performance monitoring"""
        try:
            pynvml.nvmlInit()
            self.gpu_monitoring = True
            self.num_gpus = pynvml.nvmlDeviceGetCount()
            logger.info(f"GPU monitoring enabled. Found {self.num_gpus} GPUs")
        except:
            self.gpu_monitoring = False
            self.num_gpus = 0
            logger.warning("GPU monitoring not available")

    def _setup_distributed(self):
        """Setup distributed training environment"""
        if self.config.use_deepspeed:
            self._setup_deepspeed()
        else:
            self._setup_accelerate()

    def _setup_accelerate(self):
        """Setup Accelerate for distributed training"""
        ddp_kwargs = DistributedDataParallelKwargs(
            find_unused_parameters=self.config.find_unused_parameters
        )

        self.accelerator = Accelerator(
            mixed_precision=self.config.precision if self.config.use_mixed_precision else None,
            gradient_accumulation_steps=self.config.gradient_accumulation_steps,
            log_with="wandb" if self.config.use_wandb else None,
            kwargs_handlers=[ddp_kwargs],
        )

        # Set up logging
        if self.accelerator.is_main_process:
            logging.basicConfig(
                level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            )

    def _setup_deepspeed(self):
        """Setup DeepSpeed for large model training"""
        try:
            import deepspeed

            self.deepspeed = deepspeed
            logger.info("DeepSpeed available for large model training")
        except ImportError:
            logger.warning("DeepSpeed not available, falling back to Accelerate")
            self.config.use_deepspeed = False
            self._setup_accelerate()

    def prepare_model(self, model: torch.nn.Module) -> torch.nn.Module:
        """Prepare model for distributed training"""
        self.model = model

        if self.config.use_deepspeed:
            # DeepSpeed handles model preparation
            return model
        else:
            # Compile model for better performance (PyTorch 2.0+)
            if self.config.use_compile and hasattr(torch, "compile"):
                try:
                    model = torch.compile(model)
                    logger.info("Model compiled with PyTorch 2.0")
                except Exception as e:
                    logger.warning(f"Model compilation failed: {e}")

            # Prepare with Accelerator
            model = self.accelerator.prepare_model(model)
            self.model = model

            return model

    def prepare_optimizer_and_scheduler(self, model: torch.nn.Module) -> tuple:
        """Prepare optimizer and learning rate scheduler"""
        # Create optimizer
        if self.config.optimizer.lower() == "adamw":
            optimizer = torch.optim.AdamW(
                model.parameters(),
                lr=self.config.learning_rate,
                weight_decay=self.config.weight_decay,
            )
        elif self.config.optimizer.lower() == "adam":
            optimizer = torch.optim.Adam(
                model.parameters(),
                lr=self.config.learning_rate,
                weight_decay=self.config.weight_decay,
            )
        else:
            raise ValueError(f"Unsupported optimizer: {self.config.optimizer}")

        # Create scheduler
        if self.config.scheduler.lower() == "cosine":
            scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
                optimizer, T_max=self.config.num_epochs
            )
        elif self.config.scheduler.lower() == "linear":
            scheduler = torch.optim.lr_scheduler.LinearLR(
                optimizer, start_factor=0.1, total_iters=self.config.warmup_steps
            )
        else:
            scheduler = None

        if not self.config.use_deepspeed:
            optimizer, scheduler = (
                self.accelerator.prepare_optimizer(optimizer),
                self.accelerator.prepare_scheduler(scheduler) if scheduler else None,
            )

        self.optimizer = optimizer
        self.scheduler = scheduler

        return optimizer, scheduler

    def prepare_dataloaders(self, train_dataset: Any, eval_dataset: Any | None = None) -> tuple:
        """Prepare dataloaders for distributed training"""

        # Create train dataloader
        if self.accelerator and self.accelerator.num_processes > 1:
            train_sampler = DistributedSampler(
                train_dataset,
                num_replicas=self.accelerator.num_processes,
                rank=self.accelerator.process_index,
                shuffle=True,
            )
            shuffle = False
        else:
            train_sampler = None
            shuffle = True

        train_dataloader = DataLoader(
            train_dataset,
            batch_size=self.config.batch_size,
            shuffle=shuffle,
            sampler=train_sampler,
            num_workers=self.config.dataloader_num_workers,
            pin_memory=self.config.pin_memory,
            drop_last=True,
        )

        # Create eval dataloader
        eval_dataloader = None
        if eval_dataset is not None:
            if self.accelerator and self.accelerator.num_processes > 1:
                eval_sampler = DistributedSampler(
                    eval_dataset,
                    num_replicas=self.accelerator.num_processes,
                    rank=self.accelerator.process_index,
                    shuffle=False,
                )
            else:
                eval_sampler = None

            eval_dataloader = DataLoader(
                eval_dataset,
                batch_size=self.config.batch_size,
                shuffle=False,
                sampler=eval_sampler,
                num_workers=self.config.dataloader_num_workers,
                pin_memory=self.config.pin_memory,
            )

        if not self.config.use_deepspeed:
            train_dataloader = self.accelerator.prepare_dataloader(train_dataloader)
            if eval_dataloader:
                eval_dataloader = self.accelerator.prepare_dataloader(eval_dataloader)

        self.train_dataloader = train_dataloader
        self.eval_dataloader = eval_dataloader

        return train_dataloader, eval_dataloader

    @contextmanager
    def monitor_resources(self):
        """Context manager for resource monitoring"""
        start_time = time.time()
        start_cpu = psutil.cpu_percent()
        start_memory = psutil.virtual_memory().percent

        gpu_stats = {}
        if self.gpu_monitoring:
            gpu_stats = self._get_gpu_stats()

        yield

        end_time = time.time()
        end_cpu = psutil.cpu_percent()
        end_memory = psutil.virtual_memory().percent
        duration = end_time - start_time

        if self.accelerator and self.accelerator.is_main_process:
            logger.info(
                f"Resource usage - Duration: {duration:.2f}s, "
                f"CPU: {end_cpu:.1f}%, Memory: {end_memory:.1f}%"
            )

            if self.gpu_monitoring:
                end_gpu_stats = self._get_gpu_stats()
                for gpu_id in range(self.num_gpus):
                    if gpu_id in end_gpu_stats:
                        logger.info(
                            f"GPU {gpu_id} - Memory: {end_gpu_stats[gpu_id]['memory']:.1f}%, "
                            f"Utilization: {end_gpu_stats[gpu_id]['utilization']:.1f}%"
                        )

    def _get_gpu_stats(self) -> dict[int, dict[str, float]]:
        """Get GPU statistics"""
        stats = {}
        try:
            for gpu_id in range(self.num_gpus):
                handle = pynvml.nvmlDeviceGetHandleByIndex(gpu_id)
                mem_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
                util_info = pynvml.nvmlDeviceGetUtilizationRates(handle)

                stats[gpu_id] = {
                    "memory": (mem_info.used / mem_info.total) * 100,
                    "utilization": util_info.gpu,
                    "memory_used_gb": mem_info.used / (1024**3),
                    "memory_total_gb": mem_info.total / (1024**3),
                }
        except Exception as e:
            logger.warning(f"Failed to get GPU stats: {e}")

        return stats

    def train_epoch(self, epoch: int, criterion: torch.nn.Module) -> dict[str, float]:
        """Train for one epoch"""
        self.model.train()
        total_loss = 0.0
        num_batches = 0

        # Set epoch for distributed sampler
        if hasattr(self.train_dataloader.sampler, "set_epoch"):
            self.train_dataloader.sampler.set_epoch(epoch)

        with self.monitor_resources():
            for step, batch in enumerate(self.train_dataloader):
                with self.accelerator.accumulate(self.model):
                    # Forward pass
                    if isinstance(batch, (Data, Batch)):
                        outputs = self.model(batch.x, batch.edge_index, batch.batch)
                        loss = criterion(outputs, batch.y)
                    else:
                        # Handle regular tensor batches
                        outputs = self.model(batch[0])
                        loss = criterion(outputs, batch[1])

                    # Backward pass
                    self.accelerator.backward(loss)

                    # Gradient clipping
                    if self.config.max_grad_norm > 0:
                        self.accelerator.clip_grad_norm_(
                            self.model.parameters(), self.config.max_grad_norm
                        )

                    # Optimizer step
                    self.optimizer.step()
                    self.optimizer.zero_grad()

                # Update learning rate
                if self.scheduler and not self.config.use_deepspeed:
                    self.scheduler.step()

                # Accumulate loss
                loss_value = self.accelerator.gather(loss).mean().item()
                total_loss += loss_value
                num_batches += 1

                # Logging
                if step % self.config.log_every_n_steps == 0:
                    if self.accelerator.is_main_process:
                        current_lr = self.optimizer.param_groups[0]["lr"]
                        logger.info(
                            f"Epoch {epoch}, Step {step}, Loss: {loss_value:.4f}, LR: {current_lr:.6f}"
                        )

        avg_loss = total_loss / max(num_batches, 1)
        return {"train_loss": avg_loss}

    @torch.no_grad()
    def evaluate(self, criterion: torch.nn.Module) -> dict[str, float]:
        """Evaluate the model"""
        if self.eval_dataloader is None:
            return {}

        self.model.eval()
        total_loss = 0.0
        total_correct = 0
        total_samples = 0

        for batch in self.eval_dataloader:
            if isinstance(batch, (Data, Batch)):
                outputs = self.model(batch.x, batch.edge_index, batch.batch)
                loss = criterion(outputs, batch.y)

                # Calculate accuracy
                pred = outputs.argmax(dim=-1)
                correct = (pred == batch.y).sum().item()
                samples = batch.y.size(0)
            else:
                outputs = self.model(batch[0])
                loss = criterion(outputs, batch[1])

                pred = outputs.argmax(dim=-1)
                correct = (pred == batch[1]).sum().item()
                samples = batch[1].size(0)

            # Gather metrics across processes
            loss_tensor = torch.tensor(loss.item(), device=self.accelerator.device)
            correct_tensor = torch.tensor(correct, device=self.accelerator.device)
            samples_tensor = torch.tensor(samples, device=self.accelerator.device)

            total_loss += self.accelerator.gather(loss_tensor).sum().item()
            total_correct += self.accelerator.gather(correct_tensor).sum().item()
            total_samples += self.accelerator.gather(samples_tensor).sum().item()

        avg_loss = total_loss / len(self.eval_dataloader)
        accuracy = total_correct / max(total_samples, 1)

        return {"eval_loss": avg_loss, "eval_accuracy": accuracy}

    def save_checkpoint(self, epoch: int, metrics: dict[str, float]):
        """Save training checkpoint"""
        if not self.accelerator.is_main_process:
            return

        checkpoint_dir = Path(self.config.checkpoint_dir)
        checkpoint_dir.mkdir(parents=True, exist_ok=True)

        # Prepare checkpoint data
        checkpoint = {
            "epoch": epoch,
            "model_state_dict": self.accelerator.unwrap_model(self.model).state_dict(),
            "optimizer_state_dict": self.optimizer.state_dict(),
            "metrics": metrics,
            "config": self.config,
        }

        if self.scheduler:
            checkpoint["scheduler_state_dict"] = self.scheduler.state_dict()

        # Save checkpoint
        checkpoint_path = checkpoint_dir / f"checkpoint_epoch_{epoch}.pt"
        torch.save(checkpoint, checkpoint_path)

        # Keep only the last N checkpoints
        self._cleanup_old_checkpoints(checkpoint_dir)

        logger.info(f"Checkpoint saved: {checkpoint_path}")

    def _cleanup_old_checkpoints(self, checkpoint_dir: Path):
        """Remove old checkpoints, keeping only the last N"""
        checkpoint_files = list(checkpoint_dir.glob("checkpoint_epoch_*.pt"))
        checkpoint_files.sort(key=lambda x: int(x.stem.split("_")[-1]))

        while len(checkpoint_files) > self.config.keep_last_n_checkpoints:
            old_checkpoint = checkpoint_files.pop(0)
            old_checkpoint.unlink()
            logger.info(f"Removed old checkpoint: {old_checkpoint}")

    def load_checkpoint(self, checkpoint_path: str) -> dict[str, Any]:
        """Load training checkpoint"""
        checkpoint = torch.load(checkpoint_path, map_location=self.accelerator.device)

        # Load model state
        unwrapped_model = self.accelerator.unwrap_model(self.model)
        unwrapped_model.load_state_dict(checkpoint["model_state_dict"])

        # Load optimizer state
        self.optimizer.load_state_dict(checkpoint["optimizer_state_dict"])

        # Load scheduler state
        if self.scheduler and "scheduler_state_dict" in checkpoint:
            self.scheduler.load_state_dict(checkpoint["scheduler_state_dict"])

        logger.info(f"Checkpoint loaded: {checkpoint_path}")
        return checkpoint

    def train(
        self,
        model: torch.nn.Module,
        train_dataset: Any,
        eval_dataset: Any | None = None,
        criterion: torch.nn.Module | None = None,
    ):
        """Main training loop"""

        # Prepare components
        model = self.prepare_model(model)
        optimizer, scheduler = self.prepare_optimizer_and_scheduler(model)
        train_dataloader, eval_dataloader = self.prepare_dataloaders(train_dataset, eval_dataset)

        # Default criterion
        if criterion is None:
            criterion = torch.nn.CrossEntropyLoss()

        criterion = self.accelerator.prepare_model(criterion)

        # Training loop
        for epoch in range(self.config.num_epochs):
            # Train epoch
            train_metrics = self.train_epoch(epoch, criterion)

            # Evaluate
            eval_metrics = {}
            if epoch % self.config.eval_every_n_epochs == 0:
                eval_metrics = self.evaluate(criterion)

            # Combine metrics
            all_metrics = {**train_metrics, **eval_metrics}

            # Log metrics
            if self.accelerator.is_main_process:
                logger.info(f"Epoch {epoch} completed: {all_metrics}")

            # Save checkpoint
            if epoch % self.config.save_every_n_epochs == 0:
                self.save_checkpoint(epoch, all_metrics)

        # Final checkpoint
        self.save_checkpoint(self.config.num_epochs, all_metrics)

        logger.info("Training completed successfully!")


def launch_distributed_training(training_function: Callable, config: TrainingConfig, **kwargs):
    """
    Launch distributed training across multiple processes
    """

    if config.world_size == 1:
        # Single process training
        training_function(config, **kwargs)
    else:
        # Multi-process training
        mp.spawn(training_function, args=(config, kwargs), nprocs=config.world_size, join=True)


# Example usage and utility functions
def create_sample_config() -> TrainingConfig:
    """Create a sample training configuration"""
    return TrainingConfig(
        model_name="accelerated_gnn",
        num_node_features=128,
        hidden_channels=256,
        num_classes=10,
        batch_size=32,
        learning_rate=0.001,
        num_epochs=100,
        use_mixed_precision=True,
        use_compile=True,
        checkpoint_dir="./checkpoints/distributed_training",
    )


logger.info("Distributed Training Framework initialized")
