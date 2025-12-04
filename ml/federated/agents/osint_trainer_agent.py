"""
OSINT Trainer Agent

Autonomous agent for local OSINT model training in federated learning.
"""

import asyncio
import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

import numpy as np

logger = logging.getLogger(__name__)


class AgentState(Enum):
    """Agent lifecycle states"""

    IDLE = "idle"
    INITIALIZING = "initializing"
    TRAINING = "training"
    EVALUATING = "evaluating"
    SYNCING = "syncing"
    ERROR = "error"
    STOPPED = "stopped"


@dataclass
class AgentConfig:
    """Configuration for OSINT trainer agent"""

    agent_id: str
    node_id: str

    # Training settings
    local_epochs: int = 5
    batch_size: int = 32
    learning_rate: float = 0.001

    # Data settings
    data_sources: List[str] = field(default_factory=list)
    max_samples_per_round: int = 10000

    # Privacy settings
    enable_local_dp: bool = True
    local_epsilon: float = 1.0
    clip_norm: float = 1.0

    # Air-gap settings
    airgap_mode: bool = False
    sync_path: str = "./airgap_sync"

    # Resource limits
    max_memory_mb: int = 4096
    max_training_time: float = 600.0

    # Callbacks
    on_round_complete: Optional[Callable] = None
    on_error: Optional[Callable] = None


@dataclass
class TrainingTask:
    """A training task for the agent"""

    task_id: str
    round_number: int
    global_parameters: Any
    config: Dict[str, Any]
    deadline: Optional[float] = None


class OSINTTrainerAgent:
    """
    Autonomous OSINT Trainer Agent

    Handles:
    - Local model training on OSINT data
    - Differential privacy application
    - Air-gap synchronization
    - Resource management
    """

    def __init__(self, config: AgentConfig):
        self.config = config
        self.state = AgentState.IDLE

        self._current_task: Optional[TrainingTask] = None
        self._model = None
        self._training_history: List[Dict[str, Any]] = []
        self._task_queue: asyncio.Queue = asyncio.Queue()

        # Privacy tracking
        self._privacy_spent = 0.0

        # Initialize paths
        if config.airgap_mode:
            Path(config.sync_path).mkdir(parents=True, exist_ok=True)

        logger.info(f"OSINT trainer agent {config.agent_id} initialized")

    async def start(self) -> None:
        """Start the agent"""
        self.state = AgentState.INITIALIZING
        logger.info(f"Agent {self.config.agent_id} starting")

        try:
            # Initialize model
            await self._initialize_model()

            # Start task processing loop
            self.state = AgentState.IDLE
            await self._process_tasks()

        except Exception as e:
            self.state = AgentState.ERROR
            logger.error(f"Agent startup failed: {e}")
            if self.config.on_error:
                self.config.on_error(e)

    async def stop(self) -> None:
        """Stop the agent"""
        logger.info(f"Agent {self.config.agent_id} stopping")
        self.state = AgentState.STOPPED

    async def submit_task(self, task: TrainingTask) -> str:
        """Submit a training task"""
        await self._task_queue.put(task)
        logger.info(f"Task {task.task_id} submitted to agent {self.config.agent_id}")
        return task.task_id

    async def _process_tasks(self) -> None:
        """Main task processing loop"""
        while self.state != AgentState.STOPPED:
            try:
                # Wait for task with timeout
                task = await asyncio.wait_for(
                    self._task_queue.get(),
                    timeout=60.0,
                )

                self._current_task = task
                await self._execute_task(task)
                self._current_task = None

            except asyncio.TimeoutError:
                # No task, continue waiting
                continue
            except Exception as e:
                logger.error(f"Task processing error: {e}")
                if self.config.on_error:
                    self.config.on_error(e)

    async def _execute_task(self, task: TrainingTask) -> Dict[str, Any]:
        """Execute a training task"""
        start_time = time.time()
        logger.info(f"Executing task {task.task_id} (round {task.round_number})")

        try:
            self.state = AgentState.TRAINING

            # Set global parameters
            if task.global_parameters is not None:
                await self._set_model_parameters(task.global_parameters)

            # Load local data
            train_data = await self._load_osint_data()

            # Train locally
            metrics = await self._train_local(
                train_data,
                task.config.get("local_epochs", self.config.local_epochs),
            )

            # Get updated parameters
            updated_params = await self._get_model_parameters()

            # Apply local differential privacy
            if self.config.enable_local_dp:
                updated_params = self._apply_local_dp(
                    task.global_parameters,
                    updated_params,
                )

            # Evaluate
            self.state = AgentState.EVALUATING
            eval_metrics = await self._evaluate_local()

            # Prepare result
            result = {
                "task_id": task.task_id,
                "round_number": task.round_number,
                "parameters": updated_params,
                "metrics": {**metrics, **eval_metrics},
                "num_samples": len(train_data) if train_data else 0,
                "training_time": time.time() - start_time,
                "privacy_spent": self._privacy_spent,
            }

            # Handle air-gap sync
            if self.config.airgap_mode:
                self.state = AgentState.SYNCING
                await self._export_for_airgap(result)

            # Record history
            self._training_history.append(result)

            # Callback
            if self.config.on_round_complete:
                self.config.on_round_complete(result)

            self.state = AgentState.IDLE
            logger.info(
                f"Task {task.task_id} completed - "
                f"accuracy={result['metrics'].get('accuracy', 0):.4f}"
            )

            return result

        except Exception as e:
            self.state = AgentState.ERROR
            logger.error(f"Task {task.task_id} failed: {e}")
            raise

    async def _initialize_model(self) -> None:
        """Initialize the ML model"""
        # Placeholder - in production would load actual model
        logger.info("Initializing OSINT model")
        self._model = {"type": "osint_classifier", "initialized": True}

    async def _load_osint_data(self) -> List[Any]:
        """Load local OSINT data for training"""
        # Placeholder - would load from configured data sources
        logger.info(f"Loading data from sources: {self.config.data_sources}")

        # Simulate data loading
        num_samples = min(
            np.random.randint(1000, 5000),
            self.config.max_samples_per_round,
        )

        return list(range(num_samples))

    async def _train_local(
        self,
        train_data: List[Any],
        epochs: int,
    ) -> Dict[str, float]:
        """Perform local training"""
        logger.info(f"Training for {epochs} epochs on {len(train_data)} samples")

        # Simulate training
        total_loss = 0.0
        for epoch in range(epochs):
            epoch_loss = np.random.exponential(0.5) / (epoch + 1)
            total_loss += epoch_loss
            await asyncio.sleep(0.1)  # Simulate computation

        return {
            "loss": total_loss / epochs,
            "epochs_completed": epochs,
        }

    async def _evaluate_local(self) -> Dict[str, float]:
        """Evaluate model on local test data"""
        # Simulate evaluation
        accuracy = min(0.5 + np.random.uniform(0, 0.4), 0.95)
        return {"accuracy": accuracy}

    async def _get_model_parameters(self) -> Any:
        """Get current model parameters"""
        # Placeholder - would extract actual parameters
        return np.random.randn(100, 768)

    async def _set_model_parameters(self, parameters: Any) -> None:
        """Set model parameters"""
        # Placeholder - would set actual parameters
        pass

    def _apply_local_dp(
        self,
        original_params: Any,
        updated_params: Any,
    ) -> Any:
        """Apply local differential privacy to parameter updates"""
        if original_params is None:
            return updated_params

        # Compute gradient
        gradient = updated_params - original_params

        # Clip gradient
        grad_norm = np.linalg.norm(gradient)
        if grad_norm > self.config.clip_norm:
            gradient = gradient * (self.config.clip_norm / grad_norm)

        # Add noise
        noise_scale = self.config.clip_norm / self.config.local_epsilon
        noise = np.random.normal(0, noise_scale, gradient.shape)

        # Track privacy
        self._privacy_spent += self.config.local_epsilon / 10

        return original_params + gradient + noise

    async def _export_for_airgap(self, result: Dict[str, Any]) -> str:
        """Export training result for air-gap synchronization"""
        import pickle
        import json

        export_path = Path(self.config.sync_path)

        # Export parameters
        params_file = export_path / f"update_{result['task_id']}.pkl"
        with open(params_file, "wb") as f:
            pickle.dump(result, f)

        # Export manifest
        manifest = {
            "task_id": result["task_id"],
            "round_number": result["round_number"],
            "metrics": result["metrics"],
            "timestamp": time.time(),
        }

        manifest_file = export_path / f"update_{result['task_id']}.manifest.json"
        with open(manifest_file, "w") as f:
            json.dump(manifest, f)

        logger.info(f"Exported update to {params_file}")

        return str(params_file)

    def get_status(self) -> Dict[str, Any]:
        """Get agent status"""
        return {
            "agent_id": self.config.agent_id,
            "node_id": self.config.node_id,
            "state": self.state.value,
            "current_task": (
                self._current_task.task_id if self._current_task else None
            ),
            "tasks_completed": len(self._training_history),
            "privacy_spent": self._privacy_spent,
            "airgap_mode": self.config.airgap_mode,
        }

    def get_training_history(self) -> List[Dict[str, Any]]:
        """Get training history"""
        return self._training_history.copy()
