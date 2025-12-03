"""
Federated Learning Client using Flower Framework

Implements local training on Summit nodes with support for
air-gapped operation and differential privacy.
"""

import logging
import pickle
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

import flwr as fl
from flwr.common import (
    Code,
    EvaluateIns,
    EvaluateRes,
    FitIns,
    FitRes,
    GetParametersIns,
    GetParametersRes,
    GetPropertiesIns,
    GetPropertiesRes,
    Parameters,
    Scalar,
    Status,
    ndarrays_to_parameters,
    parameters_to_ndarrays,
)

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class ClientConfig:
    """Configuration for federated learning client"""

    # Client identification
    node_id: str = "node_default"
    node_region: str = "us-east"
    node_jurisdiction: str = "US"

    # Server connection
    server_address: str = "localhost:8080"

    # Air-gap settings
    airgap_mode: bool = False
    airgap_export_path: str = "./airgap_exports"
    airgap_import_path: str = "./airgap_imports"

    # Training settings
    local_epochs: int = 1
    batch_size: int = 32
    learning_rate: float = 0.01

    # Privacy settings
    enable_local_dp: bool = True
    local_epsilon: float = 1.0
    local_delta: float = 1e-5
    clip_norm: float = 1.0
    noise_multiplier: float = 1.0

    # Data settings
    data_path: str = "./local_data"
    validation_split: float = 0.2

    # Resource constraints
    max_memory_mb: int = 4096
    max_training_time: float = 300.0  # 5 minutes

    # Capabilities
    capabilities: Dict[str, Any] = field(default_factory=lambda: {
        "gpu_available": False,
        "secure_enclave": False,
        "osint_sources": [],
    })


class FederatedClient(fl.client.NumPyClient):
    """
    Federated Learning Client for OSINT model training

    Supports:
    - Local model training with differential privacy
    - Air-gapped operation with file-based sync
    - OSINT-specific data handling
    - Resource-constrained training
    """

    def __init__(
        self,
        config: ClientConfig,
        model: Any = None,
        train_data: Any = None,
        test_data: Any = None,
    ):
        self.config = config
        self.model = model
        self.train_data = train_data
        self.test_data = test_data

        self._current_round = 0
        self._training_history: List[Dict[str, Any]] = []

        # Initialize paths for air-gap mode
        if config.airgap_mode:
            Path(config.airgap_export_path).mkdir(parents=True, exist_ok=True)
            Path(config.airgap_import_path).mkdir(parents=True, exist_ok=True)

        # Privacy mechanism
        self._privacy_accountant = PrivacyAccountant(
            epsilon=config.local_epsilon,
            delta=config.local_delta,
        )

        logger.info(
            f"Federated client initialized - node_id={config.node_id}, "
            f"airgap={config.airgap_mode}"
        )

    def get_parameters(self, config: Dict[str, Scalar]) -> List[np.ndarray]:
        """Get current model parameters"""
        if self.model is None:
            return []

        return self._get_model_parameters()

    def set_parameters(self, parameters: List[np.ndarray]) -> None:
        """Set model parameters from server"""
        if self.model is None:
            return

        self._set_model_parameters(parameters)

    def fit(
        self, parameters: List[np.ndarray], config: Dict[str, Scalar]
    ) -> Tuple[List[np.ndarray], int, Dict[str, Scalar]]:
        """Train model on local data"""
        start_time = time.time()
        self._current_round = int(config.get("server_round", 0))

        logger.info(
            f"Starting local training - round={self._current_round}, "
            f"node={self.config.node_id}"
        )

        # Set parameters from server
        self.set_parameters(parameters)

        # Get training configuration
        local_epochs = int(config.get("local_epochs", self.config.local_epochs))
        batch_size = int(config.get("batch_size", self.config.batch_size))
        learning_rate = float(config.get("learning_rate", self.config.learning_rate))

        # Train locally
        metrics = self._train_local(
            epochs=local_epochs,
            batch_size=batch_size,
            learning_rate=learning_rate,
        )

        # Apply differential privacy to gradients
        updated_parameters = self._get_model_parameters()
        if self.config.enable_local_dp:
            updated_parameters = self._apply_local_dp(
                parameters, updated_parameters
            )

        # Calculate number of samples
        num_samples = self._get_num_samples()

        training_time = time.time() - start_time

        # Record training history
        history_entry = {
            "round": self._current_round,
            "metrics": metrics,
            "num_samples": num_samples,
            "training_time": training_time,
            "timestamp": time.time(),
        }
        self._training_history.append(history_entry)

        # Export for air-gap if enabled
        if self.config.airgap_mode:
            self._export_update_airgap(updated_parameters, metrics, num_samples)

        result_metrics = {
            "loss": float(metrics.get("loss", 0)),
            "accuracy": float(metrics.get("accuracy", 0)),
            "training_time": training_time,
            "node_id": self.config.node_id,
            "privacy_spent": self._privacy_accountant.get_spent(),
        }

        logger.info(
            f"Local training completed - loss={result_metrics['loss']:.4f}, "
            f"accuracy={result_metrics['accuracy']:.4f}"
        )

        return updated_parameters, num_samples, result_metrics

    def evaluate(
        self, parameters: List[np.ndarray], config: Dict[str, Scalar]
    ) -> Tuple[float, int, Dict[str, Scalar]]:
        """Evaluate model on local test data"""
        self.set_parameters(parameters)

        metrics = self._evaluate_local()

        num_samples = self._get_num_test_samples()

        return (
            float(metrics.get("loss", 0)),
            num_samples,
            {
                "accuracy": float(metrics.get("accuracy", 0)),
                "node_id": self.config.node_id,
            },
        )

    def get_properties(self, config: Dict[str, Scalar]) -> Dict[str, Scalar]:
        """Get client properties"""
        return {
            "node_id": self.config.node_id,
            "node_region": self.config.node_region,
            "node_jurisdiction": self.config.node_jurisdiction,
            "airgap_mode": self.config.airgap_mode,
            "gpu_available": self.config.capabilities.get("gpu_available", False),
            "secure_enclave": self.config.capabilities.get("secure_enclave", False),
        }

    def _train_local(
        self,
        epochs: int,
        batch_size: int,
        learning_rate: float,
    ) -> Dict[str, float]:
        """
        Perform local training

        Override this method with actual model training logic
        """
        # Placeholder implementation
        # In production, this would use PyTorch/TensorFlow training

        if self.model is None or self.train_data is None:
            return {"loss": 0.0, "accuracy": 0.0}

        total_loss = 0.0
        total_correct = 0
        total_samples = 0

        for epoch in range(epochs):
            # Simulate epoch training
            epoch_loss = np.random.exponential(0.5) / (epoch + 1)
            epoch_accuracy = min(0.5 + 0.1 * epoch + np.random.uniform(0, 0.1), 0.95)

            total_loss += epoch_loss
            total_correct += int(epoch_accuracy * 100)
            total_samples += 100

        return {
            "loss": total_loss / epochs,
            "accuracy": total_correct / total_samples,
        }

    def _evaluate_local(self) -> Dict[str, float]:
        """
        Evaluate model on local test data

        Override this method with actual evaluation logic
        """
        if self.model is None or self.test_data is None:
            return {"loss": 0.0, "accuracy": 0.0}

        # Placeholder implementation
        return {
            "loss": np.random.exponential(0.3),
            "accuracy": min(np.random.uniform(0.7, 0.95), 0.95),
        }

    def _get_model_parameters(self) -> List[np.ndarray]:
        """Extract parameters from model"""
        if self.model is None:
            return []

        # Handle different model types
        if hasattr(self.model, "get_weights"):
            # Keras/TensorFlow
            return self.model.get_weights()
        elif hasattr(self.model, "state_dict"):
            # PyTorch
            return [
                param.detach().cpu().numpy()
                for param in self.model.state_dict().values()
            ]
        elif hasattr(self.model, "parameters"):
            # Generic neural network
            return [
                np.array(p) for p in self.model.parameters()
            ]

        return []

    def _set_model_parameters(self, parameters: List[np.ndarray]) -> None:
        """Set model parameters"""
        if self.model is None or not parameters:
            return

        # Handle different model types
        if hasattr(self.model, "set_weights"):
            # Keras/TensorFlow
            self.model.set_weights(parameters)
        elif hasattr(self.model, "load_state_dict"):
            # PyTorch
            state_dict = self.model.state_dict()
            for (key, _), param in zip(state_dict.items(), parameters):
                state_dict[key] = param
            self.model.load_state_dict(state_dict)

    def _apply_local_dp(
        self,
        original_parameters: List[np.ndarray],
        updated_parameters: List[np.ndarray],
    ) -> List[np.ndarray]:
        """Apply differential privacy to parameter updates"""
        if not self.config.enable_local_dp:
            return updated_parameters

        noised_parameters = []

        for orig, updated in zip(original_parameters, updated_parameters):
            # Compute gradient (update)
            gradient = updated - orig

            # Clip gradient
            gradient_norm = np.linalg.norm(gradient)
            if gradient_norm > self.config.clip_norm:
                gradient = gradient * (self.config.clip_norm / gradient_norm)

            # Add Gaussian noise
            noise_scale = (
                self.config.clip_norm
                * self.config.noise_multiplier
                / self._get_num_samples()
            )
            noise = np.random.normal(0, noise_scale, gradient.shape)

            # Apply noised gradient
            noised_param = orig + gradient + noise
            noised_parameters.append(noised_param)

        # Update privacy accountant
        self._privacy_accountant.spend(
            epsilon=self.config.local_epsilon / 10,  # Per-round budget
            delta=self.config.local_delta,
        )

        logger.debug(
            f"Applied local DP - privacy spent: {self._privacy_accountant.get_spent()}"
        )

        return noised_parameters

    def _get_num_samples(self) -> int:
        """Get number of training samples"""
        if self.train_data is None:
            return 1000  # Default

        if hasattr(self.train_data, "__len__"):
            return len(self.train_data)

        return 1000

    def _get_num_test_samples(self) -> int:
        """Get number of test samples"""
        if self.test_data is None:
            return 200  # Default

        if hasattr(self.test_data, "__len__"):
            return len(self.test_data)

        return 200

    def _export_update_airgap(
        self,
        parameters: List[np.ndarray],
        metrics: Dict[str, float],
        num_samples: int,
    ) -> str:
        """Export update for air-gapped server"""
        update_data = {
            "node_id": self.config.node_id,
            "round_number": self._current_round,
            "parameters": ndarrays_to_parameters(parameters),
            "metrics": metrics,
            "num_examples": num_samples,
            "timestamp": time.time(),
            "jurisdiction": self.config.node_jurisdiction,
            "region": self.config.node_region,
        }

        export_path = (
            Path(self.config.airgap_export_path)
            / f"update_round_{self._current_round}_{self.config.node_id}.pkl"
        )

        with open(export_path, "wb") as f:
            pickle.dump(update_data, f)

        # Generate manifest
        manifest_path = export_path.with_suffix(".manifest")
        manifest = {
            "node_id": self.config.node_id,
            "round_number": self._current_round,
            "timestamp": time.time(),
            "checksum": self._compute_checksum(update_data),
        }

        import json
        with open(manifest_path, "w") as f:
            json.dump(manifest, f)

        logger.info(f"Exported air-gap update to {export_path}")

        return str(export_path)

    def import_model_airgap(self) -> Optional[List[np.ndarray]]:
        """Import model from air-gapped server"""
        import_path = Path(self.config.airgap_import_path)

        # Find latest model file
        model_files = sorted(
            import_path.glob("model_round_*.pkl"),
            key=lambda p: int(p.stem.split("_")[-1]),
            reverse=True,
        )

        if not model_files:
            logger.warning("No model files found for air-gap import")
            return None

        latest_model = model_files[0]

        try:
            with open(latest_model, "rb") as f:
                model_data = pickle.load(f)

            # Verify checksum if manifest exists
            manifest_path = latest_model.with_suffix(".manifest")
            if manifest_path.exists():
                import json
                with open(manifest_path, "r") as f:
                    manifest = json.load(f)

                if manifest.get("checksum") != self._compute_checksum(model_data):
                    logger.error("Model checksum verification failed")
                    return None

            parameters = model_data.get("parameters")
            if parameters is not None:
                self._current_round = model_data.get("round_number", 0)
                logger.info(f"Imported model from {latest_model}")
                return parameters_to_ndarrays(parameters)

        except Exception as e:
            logger.error(f"Failed to import model: {e}")

        return None

    def _compute_checksum(self, data: Any) -> str:
        """Compute checksum for data integrity"""
        import hashlib

        serialized = pickle.dumps(data)
        return hashlib.sha256(serialized).hexdigest()

    def start_client(self) -> None:
        """Start the federated learning client"""
        if self.config.airgap_mode:
            logger.info("Client running in air-gap mode - use manual sync")
            return

        logger.info(f"Connecting to server at {self.config.server_address}")

        fl.client.start_numpy_client(
            server_address=self.config.server_address,
            client=self,
        )

    def run_airgap_round(self) -> Dict[str, Any]:
        """Run a single round in air-gap mode"""
        # Import latest model
        parameters = self.import_model_airgap()

        if parameters is None:
            return {"status": "error", "message": "No model available"}

        # Run local training
        updated_params, num_samples, metrics = self.fit(
            parameters,
            {
                "server_round": self._current_round,
                "local_epochs": self.config.local_epochs,
                "batch_size": self.config.batch_size,
                "learning_rate": self.config.learning_rate,
            },
        )

        return {
            "status": "success",
            "round": self._current_round,
            "metrics": metrics,
            "export_path": str(
                Path(self.config.airgap_export_path)
                / f"update_round_{self._current_round}_{self.config.node_id}.pkl"
            ),
        }

    def get_training_history(self) -> List[Dict[str, Any]]:
        """Get local training history"""
        return self._training_history.copy()

    def get_status(self) -> Dict[str, Any]:
        """Get client status"""
        return {
            "node_id": self.config.node_id,
            "current_round": self._current_round,
            "airgap_mode": self.config.airgap_mode,
            "privacy_spent": self._privacy_accountant.get_spent(),
            "privacy_remaining": self._privacy_accountant.get_remaining(),
            "training_rounds_completed": len(self._training_history),
            "capabilities": self.config.capabilities,
        }


class PrivacyAccountant:
    """Track privacy budget spending"""

    def __init__(self, epsilon: float, delta: float):
        self.total_epsilon = epsilon
        self.total_delta = delta
        self.spent_epsilon = 0.0
        self.spent_delta = 0.0

    def spend(self, epsilon: float, delta: float) -> None:
        """Record privacy spending"""
        self.spent_epsilon += epsilon
        self.spent_delta += delta

    def get_spent(self) -> float:
        """Get spent epsilon"""
        return self.spent_epsilon

    def get_remaining(self) -> float:
        """Get remaining epsilon"""
        return max(0, self.total_epsilon - self.spent_epsilon)

    def can_spend(self, epsilon: float) -> bool:
        """Check if can afford operation"""
        return self.spent_epsilon + epsilon <= self.total_epsilon

    def reset(self) -> None:
        """Reset accountant"""
        self.spent_epsilon = 0.0
        self.spent_delta = 0.0


def create_client(
    node_id: str,
    server_address: str = "localhost:8080",
    airgap_mode: bool = False,
    **kwargs,
) -> FederatedClient:
    """Factory function to create a federated client"""
    config = ClientConfig(
        node_id=node_id,
        server_address=server_address,
        airgap_mode=airgap_mode,
        **kwargs,
    )

    return FederatedClient(config)
