"""
Federated Learning Server using Flower Framework

Orchestrates federated learning across air-gapped Summit nodes
with privacy-preserving aggregation and Neo4j result storage.
"""

import logging
import pickle
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

import flwr as fl
from flwr.common import (
    Code,
    EvaluateIns,
    EvaluateRes,
    FitIns,
    FitRes,
    GetParametersIns,
    GetParametersRes,
    Parameters,
    Scalar,
    Status,
    ndarrays_to_parameters,
    parameters_to_ndarrays,
)
from flwr.server.client_manager import ClientManager, SimpleClientManager
from flwr.server.client_proxy import ClientProxy
from flwr.server.strategy import Strategy

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class ServerConfig:
    """Configuration for federated learning server"""

    # Server settings
    server_address: str = "0.0.0.0:8080"
    num_rounds: int = 10
    min_fit_clients: int = 2
    min_evaluate_clients: int = 2
    min_available_clients: int = 2
    round_timeout: float = 600.0  # 10 minutes

    # Privacy settings
    enable_differential_privacy: bool = True
    privacy_epsilon: float = 1.0
    privacy_delta: float = 1e-5
    clip_norm: float = 1.0

    # Air-gap settings
    airgap_mode: bool = False
    airgap_export_path: str = "./airgap_exports"
    airgap_import_path: str = "./airgap_imports"
    airgap_sync_interval: int = 3600  # 1 hour

    # Neo4j aggregation
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = ""
    store_in_neo4j: bool = True

    # pgvector settings
    pgvector_enabled: bool = True
    pgvector_connection_string: str = ""
    embedding_dimension: int = 768

    # Model settings
    model_save_path: str = "./federated_models"
    checkpoint_interval: int = 1

    # Metrics
    target_accuracy: float = 0.85
    convergence_threshold: float = 0.001


@dataclass
class RoundMetrics:
    """Metrics for a training round"""

    round_number: int
    num_clients: int
    aggregated_loss: float
    aggregated_accuracy: float
    privacy_budget_spent: float
    training_time: float
    client_metrics: Dict[str, Dict[str, float]] = field(default_factory=dict)


class FederatedServer:
    """
    Federated Learning Server for OSINT model training

    Supports:
    - Standard Flower federated learning
    - Air-gapped node synchronization
    - Differential privacy
    - Neo4j aggregation for graph-based results
    - pgvector embeddings storage
    """

    def __init__(
        self,
        config: ServerConfig,
        strategy: Optional[Strategy] = None,
        initial_parameters: Optional[Parameters] = None,
    ):
        self.config = config
        self.strategy = strategy
        self.initial_parameters = initial_parameters
        self.round_metrics: List[RoundMetrics] = []
        self.current_round = 0
        self.global_model_parameters: Optional[Parameters] = None
        self.privacy_budget_remaining = config.privacy_epsilon

        # Initialize storage paths
        Path(config.model_save_path).mkdir(parents=True, exist_ok=True)
        if config.airgap_mode:
            Path(config.airgap_export_path).mkdir(parents=True, exist_ok=True)
            Path(config.airgap_import_path).mkdir(parents=True, exist_ok=True)

        # Client tracking
        self._registered_nodes: Dict[str, Dict[str, Any]] = {}
        self._airgap_queue: List[Dict[str, Any]] = []

        logger.info(
            f"Federated server initialized - airgap_mode={config.airgap_mode}, "
            f"dp_enabled={config.enable_differential_privacy}"
        )

    def configure_strategy(
        self,
        on_fit_config_fn: Optional[Callable[[int], Dict[str, Scalar]]] = None,
        on_evaluate_config_fn: Optional[Callable[[int], Dict[str, Scalar]]] = None,
    ) -> Strategy:
        """Configure default strategy if none provided"""
        if self.strategy is not None:
            return self.strategy

        from .strategies import OSINTFedAvg

        def default_fit_config(server_round: int) -> Dict[str, Scalar]:
            return {
                "server_round": server_round,
                "local_epochs": 1,
                "batch_size": 32,
                "learning_rate": 0.01,
            }

        def default_evaluate_config(server_round: int) -> Dict[str, Scalar]:
            return {
                "server_round": server_round,
            }

        self.strategy = OSINTFedAvg(
            fraction_fit=0.5,
            fraction_evaluate=0.5,
            min_fit_clients=self.config.min_fit_clients,
            min_evaluate_clients=self.config.min_evaluate_clients,
            min_available_clients=self.config.min_available_clients,
            on_fit_config_fn=on_fit_config_fn or default_fit_config,
            on_evaluate_config_fn=on_evaluate_config_fn or default_evaluate_config,
            initial_parameters=self.initial_parameters,
            enable_differential_privacy=self.config.enable_differential_privacy,
            privacy_epsilon=self.config.privacy_epsilon,
            privacy_delta=self.config.privacy_delta,
            clip_norm=self.config.clip_norm,
        )

        return self.strategy

    def start_server(self) -> fl.server.History:
        """Start the federated learning server"""
        logger.info(f"Starting federated server on {self.config.server_address}")

        strategy = self.configure_strategy()

        if self.config.airgap_mode:
            return self._run_airgap_server(strategy)

        # Standard Flower server
        history = fl.server.start_server(
            server_address=self.config.server_address,
            config=fl.server.ServerConfig(num_rounds=self.config.num_rounds),
            strategy=strategy,
        )

        self._save_final_model()
        self._store_metrics_neo4j()

        return history

    def _run_airgap_server(self, strategy: Strategy) -> fl.server.History:
        """
        Run server in air-gap mode with file-based synchronization

        This mode supports disconnected nodes that synchronize via
        secure file transfers (USB, courier, etc.)
        """
        logger.info("Running in air-gap mode with file-based synchronization")

        history = fl.server.History()

        for round_num in range(1, self.config.num_rounds + 1):
            self.current_round = round_num
            round_start = time.time()

            logger.info(f"Air-gap round {round_num}/{self.config.num_rounds}")

            # Export model for air-gapped nodes
            self._export_model_for_airgap(round_num)

            # Wait for and import updates from air-gapped nodes
            updates = self._import_airgap_updates(round_num)

            if len(updates) >= self.config.min_fit_clients:
                # Aggregate updates
                aggregated = self._aggregate_airgap_updates(updates, strategy)

                if aggregated is not None:
                    self.global_model_parameters = aggregated

                    # Record metrics
                    round_time = time.time() - round_start
                    metrics = self._compute_round_metrics(
                        round_num, updates, round_time
                    )
                    self.round_metrics.append(metrics)

                    history.add_loss_distributed(
                        round_num, metrics.aggregated_loss
                    )
                    history.add_accuracy_distributed(
                        round_num, [(metrics.num_clients, metrics.aggregated_accuracy)]
                    )

                    logger.info(
                        f"Round {round_num} completed - "
                        f"loss={metrics.aggregated_loss:.4f}, "
                        f"accuracy={metrics.aggregated_accuracy:.4f}"
                    )

                    # Check convergence
                    if self._check_convergence():
                        logger.info("Training converged, stopping early")
                        break

                    # Save checkpoint
                    if round_num % self.config.checkpoint_interval == 0:
                        self._save_checkpoint(round_num)
            else:
                logger.warning(
                    f"Insufficient updates in round {round_num}: "
                    f"{len(updates)}/{self.config.min_fit_clients}"
                )

        self._save_final_model()
        self._store_metrics_neo4j()

        return history

    def _export_model_for_airgap(self, round_num: int) -> str:
        """Export current model for air-gapped nodes"""
        export_data = {
            "round_number": round_num,
            "parameters": self.global_model_parameters,
            "config": {
                "local_epochs": 1,
                "batch_size": 32,
                "learning_rate": 0.01,
            },
            "timestamp": time.time(),
            "server_id": "federated_server_main",
        }

        export_path = Path(self.config.airgap_export_path) / f"model_round_{round_num}.pkl"

        with open(export_path, "wb") as f:
            pickle.dump(export_data, f)

        # Also export as manifest for verification
        manifest_path = export_path.with_suffix(".manifest")
        manifest = {
            "round_number": round_num,
            "export_time": time.time(),
            "checksum": self._compute_checksum(export_data),
        }

        with open(manifest_path, "w") as f:
            import json
            json.dump(manifest, f)

        logger.info(f"Exported model for air-gap round {round_num} to {export_path}")

        return str(export_path)

    def _import_airgap_updates(
        self, round_num: int, timeout: float = None
    ) -> List[Dict[str, Any]]:
        """Import updates from air-gapped nodes"""
        timeout = timeout or self.config.round_timeout
        import_path = Path(self.config.airgap_import_path)
        updates = []

        # Look for update files for this round
        pattern = f"update_round_{round_num}_*.pkl"
        start_time = time.time()

        while time.time() - start_time < timeout:
            for update_file in import_path.glob(pattern):
                try:
                    with open(update_file, "rb") as f:
                        update_data = pickle.load(f)

                    # Verify checksum
                    manifest_file = update_file.with_suffix(".manifest")
                    if manifest_file.exists():
                        import json
                        with open(manifest_file, "r") as f:
                            manifest = json.load(f)

                        if manifest.get("checksum") == self._compute_checksum(update_data):
                            updates.append(update_data)
                            logger.info(
                                f"Imported valid update from {update_file.name}"
                            )
                        else:
                            logger.warning(
                                f"Checksum mismatch for {update_file.name}, skipping"
                            )
                    else:
                        # Accept without manifest in development
                        updates.append(update_data)

                    # Move processed file
                    update_file.rename(update_file.with_suffix(".processed"))
                    if manifest_file.exists():
                        manifest_file.rename(manifest_file.with_suffix(".processed"))

                except Exception as e:
                    logger.error(f"Failed to import {update_file}: {e}")

            if len(updates) >= self.config.min_fit_clients:
                break

            time.sleep(10)  # Check every 10 seconds

        return updates

    def _aggregate_airgap_updates(
        self, updates: List[Dict[str, Any]], strategy: Strategy
    ) -> Optional[Parameters]:
        """Aggregate updates from air-gapped nodes"""
        if not updates:
            return None

        # Convert updates to Flower format
        fit_results: List[Tuple[ClientProxy, FitRes]] = []

        for update in updates:
            # Create mock client proxy
            class MockClientProxy(ClientProxy):
                def __init__(self, cid: str):
                    self.cid = cid

                def get_parameters(
                    self, ins: GetParametersIns, timeout: Optional[float]
                ) -> GetParametersRes:
                    raise NotImplementedError()

                def fit(
                    self, ins: FitIns, timeout: Optional[float]
                ) -> FitRes:
                    raise NotImplementedError()

                def evaluate(
                    self, ins: EvaluateIns, timeout: Optional[float]
                ) -> EvaluateRes:
                    raise NotImplementedError()

                def reconnect(
                    self, ins: Any, timeout: Optional[float]
                ) -> Any:
                    raise NotImplementedError()

                def get_properties(
                    self, ins: Any, timeout: Optional[float]
                ) -> Any:
                    raise NotImplementedError()

            proxy = MockClientProxy(cid=update.get("node_id", "unknown"))

            fit_res = FitRes(
                status=Status(code=Code.OK, message="Success"),
                parameters=update["parameters"],
                num_examples=update.get("num_examples", 1000),
                metrics=update.get("metrics", {}),
            )

            fit_results.append((proxy, fit_res))

        # Use strategy to aggregate
        aggregated_result = strategy.aggregate_fit(
            server_round=self.current_round,
            results=fit_results,
            failures=[],
        )

        if aggregated_result is not None:
            return aggregated_result[0]

        return None

    def _compute_round_metrics(
        self,
        round_num: int,
        updates: List[Dict[str, Any]],
        training_time: float,
    ) -> RoundMetrics:
        """Compute metrics for a training round"""
        losses = [u.get("metrics", {}).get("loss", 0) for u in updates]
        accuracies = [u.get("metrics", {}).get("accuracy", 0) for u in updates]

        avg_loss = sum(losses) / len(losses) if losses else 0
        avg_accuracy = sum(accuracies) / len(accuracies) if accuracies else 0

        # Track privacy budget
        privacy_spent = 0.0
        if self.config.enable_differential_privacy:
            privacy_spent = self.config.privacy_epsilon / self.config.num_rounds
            self.privacy_budget_remaining -= privacy_spent

        client_metrics = {
            u.get("node_id", f"node_{i}"): u.get("metrics", {})
            for i, u in enumerate(updates)
        }

        return RoundMetrics(
            round_number=round_num,
            num_clients=len(updates),
            aggregated_loss=avg_loss,
            aggregated_accuracy=avg_accuracy,
            privacy_budget_spent=privacy_spent,
            training_time=training_time,
            client_metrics=client_metrics,
        )

    def _check_convergence(self) -> bool:
        """Check if training has converged"""
        if len(self.round_metrics) < 2:
            return False

        current = self.round_metrics[-1]
        previous = self.round_metrics[-2]

        # Check accuracy target
        if current.aggregated_accuracy >= self.config.target_accuracy:
            logger.info(f"Target accuracy {self.config.target_accuracy} achieved")
            return True

        # Check loss convergence
        loss_improvement = abs(previous.aggregated_loss - current.aggregated_loss)
        if loss_improvement < self.config.convergence_threshold:
            logger.info(f"Loss converged (improvement={loss_improvement:.6f})")
            return True

        return False

    def _save_checkpoint(self, round_num: int) -> str:
        """Save model checkpoint"""
        checkpoint_path = (
            Path(self.config.model_save_path) / f"checkpoint_round_{round_num}.pkl"
        )

        checkpoint_data = {
            "round_number": round_num,
            "parameters": self.global_model_parameters,
            "metrics": [m.__dict__ for m in self.round_metrics],
            "privacy_budget_remaining": self.privacy_budget_remaining,
            "timestamp": time.time(),
        }

        with open(checkpoint_path, "wb") as f:
            pickle.dump(checkpoint_data, f)

        logger.info(f"Saved checkpoint at round {round_num}")

        return str(checkpoint_path)

    def _save_final_model(self) -> str:
        """Save final trained model"""
        model_path = Path(self.config.model_save_path) / "final_model.pkl"

        model_data = {
            "parameters": self.global_model_parameters,
            "total_rounds": len(self.round_metrics),
            "final_metrics": (
                self.round_metrics[-1].__dict__ if self.round_metrics else {}
            ),
            "privacy_budget_remaining": self.privacy_budget_remaining,
            "config": self.config.__dict__,
            "timestamp": time.time(),
        }

        with open(model_path, "wb") as f:
            pickle.dump(model_data, f)

        logger.info(f"Saved final model to {model_path}")

        return str(model_path)

    def _store_metrics_neo4j(self) -> None:
        """Store training metrics in Neo4j for graph-based analysis"""
        if not self.config.store_in_neo4j or not self.config.neo4j_password:
            logger.info("Skipping Neo4j storage (not configured)")
            return

        try:
            from neo4j import GraphDatabase

            driver = GraphDatabase.driver(
                self.config.neo4j_uri,
                auth=(self.config.neo4j_user, self.config.neo4j_password),
            )

            with driver.session() as session:
                # Create training run node
                session.run(
                    """
                    CREATE (t:FederatedTrainingRun {
                        id: $id,
                        total_rounds: $total_rounds,
                        final_accuracy: $final_accuracy,
                        final_loss: $final_loss,
                        privacy_budget_used: $privacy_used,
                        airgap_mode: $airgap_mode,
                        timestamp: datetime()
                    })
                    """,
                    id=f"training_{int(time.time())}",
                    total_rounds=len(self.round_metrics),
                    final_accuracy=(
                        self.round_metrics[-1].aggregated_accuracy
                        if self.round_metrics
                        else 0
                    ),
                    final_loss=(
                        self.round_metrics[-1].aggregated_loss
                        if self.round_metrics
                        else 0
                    ),
                    privacy_used=(
                        self.config.privacy_epsilon - self.privacy_budget_remaining
                    ),
                    airgap_mode=self.config.airgap_mode,
                )

                # Store round metrics as relationships
                for metrics in self.round_metrics:
                    session.run(
                        """
                        MATCH (t:FederatedTrainingRun)
                        WHERE t.total_rounds = $total_rounds
                        CREATE (r:TrainingRound {
                            round_number: $round_num,
                            num_clients: $num_clients,
                            loss: $loss,
                            accuracy: $accuracy,
                            privacy_spent: $privacy_spent,
                            training_time: $training_time
                        })
                        CREATE (t)-[:HAS_ROUND]->(r)
                        """,
                        total_rounds=len(self.round_metrics),
                        round_num=metrics.round_number,
                        num_clients=metrics.num_clients,
                        loss=metrics.aggregated_loss,
                        accuracy=metrics.aggregated_accuracy,
                        privacy_spent=metrics.privacy_budget_spent,
                        training_time=metrics.training_time,
                    )

            driver.close()
            logger.info("Stored training metrics in Neo4j")

        except Exception as e:
            logger.error(f"Failed to store metrics in Neo4j: {e}")

    def _compute_checksum(self, data: Any) -> str:
        """Compute checksum for data integrity verification"""
        import hashlib
        import json

        # Serialize data for checksumming
        serialized = pickle.dumps(data)
        return hashlib.sha256(serialized).hexdigest()

    def register_node(
        self,
        node_id: str,
        capabilities: Dict[str, Any],
        is_airgapped: bool = False,
    ) -> bool:
        """Register a federated learning node"""
        self._registered_nodes[node_id] = {
            "capabilities": capabilities,
            "is_airgapped": is_airgapped,
            "registered_at": time.time(),
            "last_seen": time.time(),
            "rounds_participated": 0,
        }

        logger.info(
            f"Registered node {node_id} (airgapped={is_airgapped})"
        )

        return True

    def get_registered_nodes(self) -> Dict[str, Dict[str, Any]]:
        """Get all registered nodes"""
        return self._registered_nodes.copy()

    def get_training_status(self) -> Dict[str, Any]:
        """Get current training status"""
        return {
            "current_round": self.current_round,
            "total_rounds": self.config.num_rounds,
            "registered_nodes": len(self._registered_nodes),
            "airgap_mode": self.config.airgap_mode,
            "privacy_budget_remaining": self.privacy_budget_remaining,
            "latest_metrics": (
                self.round_metrics[-1].__dict__ if self.round_metrics else None
            ),
            "converged": self._check_convergence() if self.round_metrics else False,
        }
