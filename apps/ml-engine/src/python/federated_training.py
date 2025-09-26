#!/usr/bin/env python3
"""Federated learning pipeline for the Summit ML Engine."""

from __future__ import annotations

import argparse
import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

import numpy as np
import tensorflow as tf
import tensorflow_federated as tff


logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


@dataclass
class ClientExample:
    """Single training example provided by a tenant."""

    features: Sequence[float]
    label: float
    weight: float = 1.0

    @staticmethod
    def from_dict(payload: Dict[str, Any]) -> "ClientExample":
        features = payload.get("features")
        if features is None:
            raise ValueError("Example is missing 'features' field")

        if not isinstance(features, (list, tuple)):
            raise TypeError("Example features must be an ordered sequence")

        label = payload.get("label")
        if label is None:
            raise ValueError("Example is missing 'label' field")

        weight = payload.get("weight", 1.0)
        return ClientExample(
            features=[float(value) for value in features],
            label=float(label),
            weight=float(weight),
        )


@dataclass
class ClientConfig:
    """Configuration for one tenant participating in training."""

    tenant_id: str
    examples: List[ClientExample] = field(default_factory=list)

    @staticmethod
    def from_dict(payload: Dict[str, Any]) -> "ClientConfig":
        tenant_id = payload.get("tenantId") or payload.get("tenant_id")
        if not tenant_id:
            raise ValueError("Client entry must include 'tenantId'")

        raw_examples = payload.get("examples", [])
        if not isinstance(raw_examples, list) or not raw_examples:
            raise ValueError(f"Client '{tenant_id}' must include non-empty examples")

        examples = [ClientExample.from_dict(item) for item in raw_examples]
        return ClientConfig(tenant_id=tenant_id, examples=examples)


@dataclass
class FederatedTrainingConfig:
    """Complete configuration for a federated learning session."""

    job_id: str
    clients: List[ClientConfig]
    rounds: int = 5
    batch_size: int = 16
    learning_rate: float = 0.01
    model_type: str = "dense_binary_classifier"
    output: Dict[str, str] = field(default_factory=dict)

    @staticmethod
    def from_json(path: Path) -> "FederatedTrainingConfig":
        with path.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)

        job_id = payload.get("jobId") or payload.get("job_id")
        if not job_id:
            raise ValueError("Configuration must include 'jobId'")

        clients = [ClientConfig.from_dict(item) for item in payload.get("clients", [])]
        if not clients:
            raise ValueError("Federated training requires at least one client")

        return FederatedTrainingConfig(
            job_id=job_id,
            clients=clients,
            rounds=int(payload.get("rounds", 5)),
            batch_size=int(payload.get("batchSize", 16)),
            learning_rate=float(payload.get("learningRate", 0.01)),
            model_type=payload.get("modelType", "dense_binary_classifier"),
            output=payload.get("output", {}),
        )

    def metrics_path(self) -> Path:
        metrics = self.output.get("metricsPath") or self.output.get("metrics_path")
        if not metrics:
            raise ValueError("Configuration output must include 'metricsPath'")
        return Path(metrics)

    def model_path(self) -> Path:
        model = self.output.get("modelPath") or self.output.get("model_path")
        if not model:
            raise ValueError("Configuration output must include 'modelPath'")
        return Path(model)


def build_keras_model(feature_dim: int, model_type: str = "dense_binary_classifier") -> tf.keras.Model:
    """Creates the Keras model used for local and federated training."""

    if model_type == "dense_binary_classifier":
        return tf.keras.Sequential(
            [
                tf.keras.layers.Input(shape=(feature_dim,)),
                tf.keras.layers.Dense(64, activation="relu"),
                tf.keras.layers.Dense(32, activation="relu"),
                tf.keras.layers.Dense(1, activation="sigmoid"),
            ]
        )

    raise ValueError(f"Unsupported federated model type: {model_type}")


def compile_model(model: tf.keras.Model, learning_rate: float) -> None:
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=learning_rate),
        loss=tf.keras.losses.BinaryCrossentropy(),
        metrics=[
            tf.keras.metrics.BinaryAccuracy(name="accuracy"),
            tf.keras.metrics.Precision(name="precision"),
            tf.keras.metrics.Recall(name="recall"),
        ],
    )


def create_client_dataset(config: ClientConfig, batch_size: int) -> tf.data.Dataset:
    features = np.array([example.features for example in config.examples], dtype=np.float32)
    labels = np.array([[example.label] for example in config.examples], dtype=np.float32)

    dataset = tf.data.Dataset.from_tensor_slices((features, labels))
    dataset = dataset.shuffle(buffer_size=len(config.examples), seed=42)
    dataset = dataset.batch(batch_size, drop_remainder=False)
    return dataset


def create_federated_datasets(
    clients: Sequence[ClientConfig],
    batch_size: int,
) -> List[tf.data.Dataset]:
    return [create_client_dataset(client, batch_size) for client in clients]


def extract_loss(metrics: Any) -> Optional[float]:
    """Recursively searches for a scalar loss metric."""

    if metrics is None:
        return None

    if isinstance(metrics, (list, tuple)):
        for value in metrics:
            result = extract_loss(value)
            if result is not None:
                return result
        return None

    if isinstance(metrics, dict):
        if "loss" in metrics and isinstance(metrics["loss"], (float, int)):
            return float(metrics["loss"])
        for value in metrics.values():
            result = extract_loss(value)
            if result is not None:
                return result
        return None

    if hasattr(metrics, "_asdict"):
        return extract_loss(metrics._asdict())

    if hasattr(metrics, "__dict__"):
        return extract_loss(vars(metrics))

    return None


def aggregate_client_data(clients: Sequence[ClientConfig]) -> tf.data.Dataset:
    """Creates a single dataset from all client examples for evaluation."""

    features: List[List[float]] = []
    labels: List[List[float]] = []
    for client in clients:
        for example in client.examples:
            features.append(list(example.features))
            labels.append([example.label])

    dataset = tf.data.Dataset.from_tensor_slices(
        (
            np.array(features, dtype=np.float32),
            np.array(labels, dtype=np.float32),
        )
    )
    return dataset.batch(32)


def run_federated_training(config: FederatedTrainingConfig) -> Dict[str, Any]:
    feature_dim = len(config.clients[0].examples[0].features)
    federated_datasets = create_federated_datasets(config.clients, config.batch_size)

    element_spec = federated_datasets[0].element_spec

    def model_fn() -> tff.learning.models.VariableModel:
        keras_model = build_keras_model(feature_dim, config.model_type)
        return tff.learning.models.from_keras_model(
            keras_model,
            input_spec=element_spec,
            loss=tf.keras.losses.BinaryCrossentropy(),
            metrics=[
                tf.keras.metrics.BinaryAccuracy(name="accuracy"),
                tf.keras.metrics.Precision(name="precision"),
                tf.keras.metrics.Recall(name="recall"),
            ],
        )

    iterative_process = tff.learning.algorithms.build_weighted_fed_avg(
        model_fn=model_fn,
        client_optimizer_fn=lambda: tf.keras.optimizers.Adam(
            learning_rate=config.learning_rate
        ),
        server_optimizer_fn=lambda: tf.keras.optimizers.SGD(learning_rate=1.0),
    )

    state = iterative_process.initialize()
    loss_history: List[float] = []

    logger.info(
        "Starting federated training job %s for %d rounds", config.job_id, config.rounds
    )
    for round_number in range(1, config.rounds + 1):
        state, round_metrics = iterative_process.next(state, federated_datasets)
        try:
            metrics_container = tff.structure.to_py_container(round_metrics)
        except AttributeError:
            metrics_container = round_metrics
        loss_value = extract_loss(metrics_container)
        loss_history.append(float(loss_value) if loss_value is not None else float("nan"))
        logger.info(
            "Completed round %d/%d - loss %.4f",
            round_number,
            config.rounds,
            loss_history[-1],
        )

    model_weights = iterative_process.get_model_weights(state)

    evaluation_model = build_keras_model(feature_dim, config.model_type)
    compile_model(evaluation_model, learning_rate=config.learning_rate)
    model_weights.assign_weights_to(evaluation_model)

    evaluation_dataset = aggregate_client_data(config.clients)
    eval_results = evaluation_model.evaluate(evaluation_dataset, verbose=0)
    metric_names = evaluation_model.metrics_names
    global_metrics = {name: float(value) for name, value in zip(metric_names, eval_results)}

    evaluation_model.save(config.model_path(), include_optimizer=False)
    logger.info("Saved global model to %s", config.model_path())

    client_counts = {client.tenant_id: len(client.examples) for client in config.clients}

    return {
        "jobId": config.job_id,
        "roundsCompleted": config.rounds,
        "trainingLossHistory": loss_history,
        "globalMetrics": global_metrics,
        "clientExampleCounts": client_counts,
        "timestamp": float(tf.timestamp().numpy()),
        "modelPath": str(config.model_path()),
    }


def save_metrics(metrics_payload: Dict[str, Any], destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("w", encoding="utf-8") as handle:
        json.dump(metrics_payload, handle, indent=2)
    logger.info("Saved federated metrics to %s", destination)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run TensorFlow Federated training for Summit"
    )
    parser.add_argument("config", type=Path, help="Path to federated training configuration JSON")
    parser.add_argument("metrics", type=Path, help="Output path for metrics JSON")
    parser.add_argument("model", type=Path, help="Output path for the aggregated model")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    config = FederatedTrainingConfig.from_json(args.config)
    config.output["metricsPath"] = str(args.metrics)
    config.output["modelPath"] = str(args.model)

    metrics_payload = run_federated_training(config)
    save_metrics(metrics_payload, args.metrics)


if __name__ == "__main__":
    main()
