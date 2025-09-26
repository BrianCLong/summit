"""Federated learning helpers built on TensorFlow Federated.

This module centralises the orchestration logic required to run
privacy-preserving federated learning rounds from the IntelGraph
Python runtime.  The implementation intentionally avoids importing
TensorFlow Federated (TFF) at module import time so that downstream
code can continue to function when the optional dependency is not
installed.  The heavy imports are deferred until a training job is
executed which also keeps unit tests lightweight.

The engine exposes a small wrapper that orchestrates rounds, applies
Gaussian differential privacy accounting, and normalises the metrics
emitted by TFF so that they can be persisted as JSON blobs.
"""

from __future__ import annotations

import dataclasses
import json
import logging
import math
import random
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Callable, Dict, Iterable, List, Optional, Sequence

logger = logging.getLogger(__name__)


try:  # pragma: no cover - optional dependency
    import tensorflow as tf  # type: ignore
    import tensorflow_federated as tff  # type: ignore
except Exception:  # pragma: no cover - handled gracefully at runtime
    tf = None  # type: ignore
    tff = None  # type: ignore


@dataclass
class FederatedTrainingConfig:
    """Configuration for a federated learning job."""

    rounds: int = 5
    clients_per_round: int = 2
    batch_size: int = 16
    client_learning_rate: float = 0.05
    server_learning_rate: float = 1.0
    noise_multiplier: float = 1.1
    clipping_norm: float = 1.0
    delta: float = 1e-5
    target_accuracy: Optional[float] = None

    def to_json(self) -> Dict[str, Any]:
        return dataclasses.asdict(self)


@dataclass
class FederatedTrainingResult:
    """Summary returned after a federated optimisation run."""

    rounds_completed: int
    metrics: List[Dict[str, Any]]
    privacy: Dict[str, Any]
    completed_at: datetime

    def to_json(self) -> Dict[str, Any]:
        return {
            "rounds_completed": self.rounds_completed,
            "metrics": self.metrics,
            "privacy": self.privacy,
            "completed_at": self.completed_at.isoformat(),
        }


def _ensure_dependencies() -> None:
    """Raise an informative error if TensorFlow Federated is missing."""

    if tf is None or tff is None:  # pragma: no cover - simple guard
        raise ImportError(
            "TensorFlow Federated (and TensorFlow) are required for federated "
            "training. Install them with `pip install tensorflow_federated` "
            "and `pip install tensorflow`."
        )


def build_default_model_fn(feature_dim: int, num_classes: int = 1) -> Callable[[], Any]:
    """Return a TFF-compatible model_fn backed by a simple Keras model."""

    def model_fn():
        _ensure_dependencies()

        keras_model = tf.keras.Sequential(
            [
                tf.keras.layers.Input(shape=(feature_dim,)),
                tf.keras.layers.Dense(32, activation="relu"),
                tf.keras.layers.Dense(num_classes, activation="sigmoid" if num_classes == 1 else "softmax"),
            ]
        )

        loss = (
            tf.keras.losses.BinaryCrossentropy()
            if num_classes == 1
            else tf.keras.losses.CategoricalCrossentropy()
        )

        metrics = [
            tf.keras.metrics.BinaryAccuracy()
            if num_classes == 1
            else tf.keras.metrics.CategoricalAccuracy(),
            tf.keras.metrics.AUC(name="auc"),
        ]

        input_spec = (
            tf.TensorSpec(shape=[None, feature_dim], dtype=tf.float32),
            tf.TensorSpec(shape=[None, num_classes] if num_classes > 1 else [None, 1], dtype=tf.float32),
        )

        return tff.learning.models.from_keras_model(
            keras_model,
            input_spec=input_spec,
            loss=loss,
            metrics=metrics,
        )

    return model_fn


def gaussian_dp_epsilon(noise_multiplier: float, rounds: int, delta: float) -> float:
    """Approximate epsilon for the Gaussian mechanism via a simple bound."""

    if noise_multiplier <= 0 or delta <= 0 or delta >= 1:
        return float("inf")
    return math.sqrt(2 * rounds * math.log(1 / delta)) / noise_multiplier


class FederatedLearningEngine:
    """Small orchestrator that wraps TFF algorithms with DP guarantees."""

    def __init__(
        self,
        model_fn: Callable[[], Any],
        config: FederatedTrainingConfig,
        algorithm_builder: Optional[Callable[[], Any]] = None,
        random_seed: Optional[int] = None,
    ) -> None:
        self.model_fn = model_fn
        self.config = config
        self._algorithm_builder = algorithm_builder
        if random_seed is not None:
            random.seed(random_seed)

    @staticmethod
    def is_supported() -> bool:
        return tf is not None and tff is not None

    @staticmethod
    def prepare_datasets(
        client_examples: Sequence[Sequence[Dict[str, Any]]],
        batch_size: int,
    ) -> List[Any]:
        """Convert per-client examples into tf.data.Dataset batches."""

        _ensure_dependencies()

        datasets: List[Any] = []
        for client in client_examples:
            if not client:
                raise ValueError("Client dataset may not be empty")
            features = []
            labels = []
            for example in client:
                if "features" not in example or "label" not in example:
                    raise ValueError("Each example must include 'features' and 'label' keys")
                features.append(example["features"])
                labels.append(example["label"])
            client_ds = tf.data.Dataset.from_tensor_slices((features, labels))
            datasets.append(client_ds.batch(batch_size))
        return datasets

    def _build_algorithm(self) -> Any:
        if self._algorithm_builder is not None:
            return self._algorithm_builder()

        _ensure_dependencies()

        dp_factory = tff.aggregators.DifferentiallyPrivateFactory.gaussian_noise(
            noise_multiplier=self.config.noise_multiplier,
            clients_per_round=self.config.clients_per_round,
            l2_norm_clip=self.config.clipping_norm,
        )

        client_opt = lambda: tf.keras.optimizers.SGD(self.config.client_learning_rate)
        server_opt = lambda: tf.keras.optimizers.SGD(self.config.server_learning_rate)

        return tff.learning.algorithms.build_unweighted_fed_avg(
            model_fn=self.model_fn,
            client_optimizer_fn=client_opt,
            server_optimizer_fn=server_opt,
            model_aggregation_factory=dp_factory,
        )

    @staticmethod
    def _normalise_metrics(metrics: Any) -> Dict[str, Any]:
        if isinstance(metrics, dict):
            return {k: FederatedLearningEngine._normalise_metrics(v) for k, v in metrics.items()}
        if hasattr(metrics, "numpy"):
            return metrics.numpy().item() if metrics.numpy().shape == () else metrics.numpy().tolist()
        if isinstance(metrics, (list, tuple)):
            return [FederatedLearningEngine._normalise_metrics(v) for v in metrics]
        return metrics

    def run(self, client_data: Sequence[Any]) -> FederatedTrainingResult:
        if not client_data:
            raise ValueError("client_data must include at least one client dataset")

        algorithm = self._build_algorithm()
        state = algorithm.initialize()
        history: List[Dict[str, Any]] = []

        for round_idx in range(1, self.config.rounds + 1):
            sampled = self._sample_clients(client_data)
            state, round_metrics = algorithm.next(state, sampled)
            serialised = self._normalise_metrics(round_metrics)
            serialised["round"] = round_idx
            history.append(serialised)

            if self._meets_target(serialised):
                logger.info("Target metric reached; stopping early at round %s", round_idx)
                break

        epsilon = gaussian_dp_epsilon(
            self.config.noise_multiplier,
            len(history),
            self.config.delta,
        )

        return FederatedTrainingResult(
            rounds_completed=len(history),
            metrics=history,
            privacy={
                "epsilon": epsilon,
                "delta": self.config.delta,
                "noise_multiplier": self.config.noise_multiplier,
            },
            completed_at=datetime.utcnow(),
        )

    def _sample_clients(self, client_data: Sequence[Any]) -> Sequence[Any]:
        if len(client_data) <= self.config.clients_per_round:
            return client_data
        return random.sample(list(client_data), self.config.clients_per_round)

    def _meets_target(self, metrics: Dict[str, Any]) -> bool:
        if not self.config.target_accuracy:
            return False

        accuracy = None
        if "accuracy" in metrics:
            accuracy = metrics.get("accuracy")
        elif isinstance(metrics.get("train"), dict) and "accuracy" in metrics["train"]:
            accuracy = metrics["train"]["accuracy"]
        if isinstance(accuracy, (list, tuple)):
            accuracy = accuracy[-1]
        try:
            return accuracy is not None and float(accuracy) >= float(self.config.target_accuracy)
        except (TypeError, ValueError):
            return False


def serialise_client_config(client_config: Sequence[Dict[str, Any]]) -> str:
    """Produce a deterministic JSON string for provenance records."""

    normalised = sorted(client_config, key=lambda item: item.get("client_id", ""))
    return json.dumps(normalised, sort_keys=True)


__all__ = [
    "FederatedLearningEngine",
    "FederatedTrainingConfig",
    "FederatedTrainingResult",
    "build_default_model_fn",
    "gaussian_dp_epsilon",
    "serialise_client_config",
]

