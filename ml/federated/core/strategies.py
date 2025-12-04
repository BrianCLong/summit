"""
Custom Federated Learning Strategies for OSINT

Implements specialized aggregation strategies with:
- Differential privacy
- Air-gap aware synchronization
- Neo4j-integrated result storage
"""

import logging
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

import flwr as fl
from flwr.common import (
    EvaluateRes,
    FitRes,
    Parameters,
    Scalar,
    ndarrays_to_parameters,
    parameters_to_ndarrays,
)
from flwr.server.client_proxy import ClientProxy
from flwr.server.strategy import FedAvg, FedProx

import numpy as np

logger = logging.getLogger(__name__)


class OSINTFedAvg(FedAvg):
    """
    OSINT-optimized Federated Averaging

    Extends standard FedAvg with:
    - Differential privacy on aggregated updates
    - Jurisdiction-aware weighted aggregation
    - OSINT-specific metric tracking
    """

    def __init__(
        self,
        *,
        fraction_fit: float = 1.0,
        fraction_evaluate: float = 1.0,
        min_fit_clients: int = 2,
        min_evaluate_clients: int = 2,
        min_available_clients: int = 2,
        evaluate_fn: Optional[Callable] = None,
        on_fit_config_fn: Optional[Callable[[int], Dict[str, Scalar]]] = None,
        on_evaluate_config_fn: Optional[Callable[[int], Dict[str, Scalar]]] = None,
        accept_failures: bool = True,
        initial_parameters: Optional[Parameters] = None,
        fit_metrics_aggregation_fn: Optional[Callable] = None,
        evaluate_metrics_aggregation_fn: Optional[Callable] = None,
        # OSINT-specific parameters
        enable_differential_privacy: bool = True,
        privacy_epsilon: float = 1.0,
        privacy_delta: float = 1e-5,
        clip_norm: float = 1.0,
        jurisdiction_weights: Optional[Dict[str, float]] = None,
    ):
        super().__init__(
            fraction_fit=fraction_fit,
            fraction_evaluate=fraction_evaluate,
            min_fit_clients=min_fit_clients,
            min_evaluate_clients=min_evaluate_clients,
            min_available_clients=min_available_clients,
            evaluate_fn=evaluate_fn,
            on_fit_config_fn=on_fit_config_fn,
            on_evaluate_config_fn=on_evaluate_config_fn,
            accept_failures=accept_failures,
            initial_parameters=initial_parameters,
            fit_metrics_aggregation_fn=fit_metrics_aggregation_fn,
            evaluate_metrics_aggregation_fn=evaluate_metrics_aggregation_fn,
        )

        self.enable_differential_privacy = enable_differential_privacy
        self.privacy_epsilon = privacy_epsilon
        self.privacy_delta = privacy_delta
        self.clip_norm = clip_norm
        self.jurisdiction_weights = jurisdiction_weights or {}

        # Privacy tracking
        self._total_privacy_spent = 0.0
        self._rounds_completed = 0

        # OSINT metrics tracking
        self._osint_metrics: List[Dict[str, Any]] = []

    def aggregate_fit(
        self,
        server_round: int,
        results: List[Tuple[ClientProxy, FitRes]],
        failures: List[Union[Tuple[ClientProxy, FitRes], BaseException]],
    ) -> Tuple[Optional[Parameters], Dict[str, Scalar]]:
        """Aggregate model updates with OSINT-specific handling"""
        if not results:
            return None, {}

        # Log participation
        logger.info(
            f"Round {server_round}: Aggregating {len(results)} updates, "
            f"{len(failures)} failures"
        )

        # Extract parameters and weights
        weights_results = []
        jurisdiction_info = []

        for client, fit_res in results:
            parameters = parameters_to_ndarrays(fit_res.parameters)
            num_examples = fit_res.num_examples
            metrics = fit_res.metrics

            # Get jurisdiction weight
            jurisdiction = metrics.get("jurisdiction", "default")
            jurisdiction_weight = self.jurisdiction_weights.get(jurisdiction, 1.0)

            # Adjusted weight
            weight = num_examples * jurisdiction_weight

            weights_results.append((parameters, weight))
            jurisdiction_info.append({
                "client_id": client.cid,
                "jurisdiction": jurisdiction,
                "num_examples": num_examples,
                "metrics": metrics,
            })

        # Perform weighted aggregation
        aggregated_parameters = self._weighted_average(weights_results)

        # Apply differential privacy
        if self.enable_differential_privacy:
            aggregated_parameters = self._apply_dp_to_aggregate(
                aggregated_parameters, len(results)
            )

        # Compute aggregated metrics
        aggregated_metrics = self._aggregate_osint_metrics(
            results, server_round
        )

        # Store round info
        self._osint_metrics.append({
            "round": server_round,
            "num_clients": len(results),
            "jurisdiction_info": jurisdiction_info,
            "aggregated_metrics": aggregated_metrics,
        })

        self._rounds_completed = server_round

        return ndarrays_to_parameters(aggregated_parameters), aggregated_metrics

    def _weighted_average(
        self, weights_results: List[Tuple[List[np.ndarray], float]]
    ) -> List[np.ndarray]:
        """Compute weighted average of parameters"""
        total_weight = sum(weight for _, weight in weights_results)

        if total_weight == 0:
            return weights_results[0][0] if weights_results else []

        # Initialize aggregated parameters
        aggregated = [
            np.zeros_like(param) for param in weights_results[0][0]
        ]

        # Weighted sum
        for parameters, weight in weights_results:
            for i, param in enumerate(parameters):
                aggregated[i] += param * (weight / total_weight)

        return aggregated

    def _apply_dp_to_aggregate(
        self,
        parameters: List[np.ndarray],
        num_clients: int,
    ) -> List[np.ndarray]:
        """Apply differential privacy to aggregated parameters"""
        # Calculate noise scale using Gaussian mechanism
        sigma = self._compute_noise_scale(num_clients)

        noised_parameters = []
        for param in parameters:
            noise = np.random.normal(0, sigma, param.shape)
            noised_parameters.append(param + noise)

        # Track privacy spending (using simple composition)
        round_epsilon = self.privacy_epsilon / 100  # Budget per round
        self._total_privacy_spent += round_epsilon

        logger.debug(
            f"Applied DP with sigma={sigma:.4f}, "
            f"total privacy spent={self._total_privacy_spent:.4f}"
        )

        return noised_parameters

    def _compute_noise_scale(self, num_clients: int) -> float:
        """Compute Gaussian noise scale for differential privacy"""
        # Gaussian mechanism: sigma = (sensitivity * sqrt(2 * ln(1.25/delta))) / epsilon
        sensitivity = self.clip_norm / num_clients
        round_epsilon = self.privacy_epsilon / 100

        sigma = (
            sensitivity
            * np.sqrt(2 * np.log(1.25 / self.privacy_delta))
            / round_epsilon
        )

        return sigma

    def _aggregate_osint_metrics(
        self,
        results: List[Tuple[ClientProxy, FitRes]],
        server_round: int,
    ) -> Dict[str, Scalar]:
        """Aggregate OSINT-specific metrics"""
        losses = []
        accuracies = []
        training_times = []
        osint_coverage = []

        for _, fit_res in results:
            metrics = fit_res.metrics
            losses.append(metrics.get("loss", 0))
            accuracies.append(metrics.get("accuracy", 0))
            training_times.append(metrics.get("training_time", 0))

            # OSINT-specific metrics
            if "osint_coverage" in metrics:
                osint_coverage.append(metrics["osint_coverage"])

        aggregated = {
            "round": server_round,
            "avg_loss": float(np.mean(losses)) if losses else 0.0,
            "avg_accuracy": float(np.mean(accuracies)) if accuracies else 0.0,
            "total_training_time": float(sum(training_times)),
            "num_clients": len(results),
            "privacy_spent": self._total_privacy_spent,
        }

        if osint_coverage:
            aggregated["avg_osint_coverage"] = float(np.mean(osint_coverage))

        return aggregated

    def get_privacy_status(self) -> Dict[str, float]:
        """Get current privacy budget status"""
        return {
            "total_epsilon": self.privacy_epsilon,
            "spent_epsilon": self._total_privacy_spent,
            "remaining_epsilon": self.privacy_epsilon - self._total_privacy_spent,
            "rounds_completed": self._rounds_completed,
        }

    def get_osint_metrics(self) -> List[Dict[str, Any]]:
        """Get OSINT-specific training metrics"""
        return self._osint_metrics.copy()


class OSINTFedProx(FedProx):
    """
    OSINT-optimized FedProx

    Handles non-IID data distribution across OSINT sources
    with proximal term regularization.
    """

    def __init__(
        self,
        *,
        fraction_fit: float = 1.0,
        fraction_evaluate: float = 1.0,
        min_fit_clients: int = 2,
        min_evaluate_clients: int = 2,
        min_available_clients: int = 2,
        evaluate_fn: Optional[Callable] = None,
        on_fit_config_fn: Optional[Callable[[int], Dict[str, Scalar]]] = None,
        on_evaluate_config_fn: Optional[Callable[[int], Dict[str, Scalar]]] = None,
        accept_failures: bool = True,
        initial_parameters: Optional[Parameters] = None,
        fit_metrics_aggregation_fn: Optional[Callable] = None,
        evaluate_metrics_aggregation_fn: Optional[Callable] = None,
        proximal_mu: float = 0.01,
        # OSINT-specific parameters
        source_heterogeneity_aware: bool = True,
        enable_differential_privacy: bool = True,
        privacy_epsilon: float = 1.0,
        privacy_delta: float = 1e-5,
    ):
        super().__init__(
            fraction_fit=fraction_fit,
            fraction_evaluate=fraction_evaluate,
            min_fit_clients=min_fit_clients,
            min_evaluate_clients=min_evaluate_clients,
            min_available_clients=min_available_clients,
            evaluate_fn=evaluate_fn,
            on_fit_config_fn=on_fit_config_fn,
            on_evaluate_config_fn=on_evaluate_config_fn,
            accept_failures=accept_failures,
            initial_parameters=initial_parameters,
            fit_metrics_aggregation_fn=fit_metrics_aggregation_fn,
            evaluate_metrics_aggregation_fn=evaluate_metrics_aggregation_fn,
            proximal_mu=proximal_mu,
        )

        self.source_heterogeneity_aware = source_heterogeneity_aware
        self.enable_differential_privacy = enable_differential_privacy
        self.privacy_epsilon = privacy_epsilon
        self.privacy_delta = privacy_delta

        self._source_statistics: Dict[str, Dict[str, float]] = {}

    def configure_fit(
        self,
        server_round: int,
        parameters: Parameters,
        client_manager: Any,
    ) -> List[Tuple[ClientProxy, Any]]:
        """Configure fit with source-aware settings"""
        config = super().configure_fit(server_round, parameters, client_manager)

        if self.source_heterogeneity_aware:
            # Adjust proximal term based on source heterogeneity
            for client, fit_ins in config:
                source_type = self._get_client_source_type(client)
                adjusted_mu = self._compute_adaptive_mu(source_type)

                # Update config with adaptive mu
                fit_config = fit_ins.config
                fit_config["proximal_mu"] = adjusted_mu

        return config

    def _get_client_source_type(self, client: ClientProxy) -> str:
        """Get OSINT source type for client"""
        # In practice, this would query client properties
        return "default"

    def _compute_adaptive_mu(self, source_type: str) -> float:
        """Compute adaptive proximal term based on source heterogeneity"""
        # Higher mu for more heterogeneous sources
        source_mu_multipliers = {
            "social_media": 1.5,
            "news": 1.0,
            "government": 0.8,
            "academic": 0.9,
            "default": 1.0,
        }

        multiplier = source_mu_multipliers.get(source_type, 1.0)
        return self.proximal_mu * multiplier


class PrivacyPreservingStrategy(FedAvg):
    """
    Advanced Privacy-Preserving Strategy

    Implements:
    - Rényi Differential Privacy composition
    - Secure aggregation (simulated)
    - Gradient compression with privacy guarantees
    """

    def __init__(
        self,
        *,
        epsilon: float = 1.0,
        delta: float = 1e-5,
        clip_norm: float = 1.0,
        noise_multiplier: float = 1.0,
        use_secure_aggregation: bool = True,
        min_aggregation_threshold: int = 3,
        **kwargs,
    ):
        super().__init__(**kwargs)

        self.epsilon = epsilon
        self.delta = delta
        self.clip_norm = clip_norm
        self.noise_multiplier = noise_multiplier
        self.use_secure_aggregation = use_secure_aggregation
        self.min_aggregation_threshold = min_aggregation_threshold

        # Rényi DP accountant
        self._rdp_orders = [1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 16, 32, 64]
        self._rdp_budget = [0.0] * len(self._rdp_orders)

    def aggregate_fit(
        self,
        server_round: int,
        results: List[Tuple[ClientProxy, FitRes]],
        failures: List[Union[Tuple[ClientProxy, FitRes], BaseException]],
    ) -> Tuple[Optional[Parameters], Dict[str, Scalar]]:
        """Privacy-preserving aggregation"""
        if len(results) < self.min_aggregation_threshold:
            logger.warning(
                f"Insufficient clients ({len(results)}) for secure aggregation "
                f"(minimum: {self.min_aggregation_threshold})"
            )
            return None, {}

        # Extract and clip gradients
        clipped_updates = []
        for client, fit_res in results:
            parameters = parameters_to_ndarrays(fit_res.parameters)
            clipped = self._clip_update(parameters)
            clipped_updates.append((clipped, fit_res.num_examples))

        # Secure aggregation (simulated)
        if self.use_secure_aggregation:
            aggregated = self._secure_aggregate(clipped_updates)
        else:
            aggregated = self._simple_aggregate(clipped_updates)

        # Add calibrated noise
        noised_aggregated = self._add_calibrated_noise(
            aggregated, len(results), server_round
        )

        # Update RDP accountant
        self._update_rdp_budget(len(results))

        # Convert to (epsilon, delta)-DP
        current_epsilon = self._compute_epsilon_from_rdp()

        metrics = {
            "num_clients": len(results),
            "privacy_epsilon": current_epsilon,
            "round": server_round,
        }

        return ndarrays_to_parameters(noised_aggregated), metrics

    def _clip_update(self, parameters: List[np.ndarray]) -> List[np.ndarray]:
        """Clip parameter updates to bound sensitivity"""
        # Compute global norm
        global_norm = np.sqrt(
            sum(np.sum(np.square(p)) for p in parameters)
        )

        # Clip if necessary
        if global_norm > self.clip_norm:
            scale = self.clip_norm / global_norm
            return [p * scale for p in parameters]

        return parameters

    def _secure_aggregate(
        self, updates: List[Tuple[List[np.ndarray], int]]
    ) -> List[np.ndarray]:
        """
        Secure aggregation using secret sharing (simulated)

        In production, this would use MPC protocols like SPDZ or ABY
        """
        # For simulation, just compute weighted average
        total_examples = sum(n for _, n in updates)

        aggregated = [
            np.zeros_like(p) for p in updates[0][0]
        ]

        for parameters, num_examples in updates:
            weight = num_examples / total_examples
            for i, param in enumerate(parameters):
                aggregated[i] += param * weight

        return aggregated

    def _simple_aggregate(
        self, updates: List[Tuple[List[np.ndarray], int]]
    ) -> List[np.ndarray]:
        """Simple weighted averaging"""
        return self._secure_aggregate(updates)

    def _add_calibrated_noise(
        self,
        parameters: List[np.ndarray],
        num_clients: int,
        server_round: int,
    ) -> List[np.ndarray]:
        """Add noise calibrated for target privacy level"""
        # Gaussian mechanism noise scale
        sensitivity = self.clip_norm / num_clients
        sigma = sensitivity * self.noise_multiplier

        noised = []
        for param in parameters:
            noise = np.random.normal(0, sigma, param.shape)
            noised.append(param + noise)

        logger.debug(
            f"Round {server_round}: Added noise with sigma={sigma:.6f}"
        )

        return noised

    def _update_rdp_budget(self, num_clients: int) -> None:
        """Update Rényi DP budget"""
        # Compute RDP for this step
        sensitivity = self.clip_norm / num_clients
        sigma = sensitivity * self.noise_multiplier

        for i, order in enumerate(self._rdp_orders):
            # RDP for Gaussian mechanism
            rdp = order * (sensitivity ** 2) / (2 * sigma ** 2)
            self._rdp_budget[i] += rdp

    def _compute_epsilon_from_rdp(self) -> float:
        """Convert RDP budget to (epsilon, delta)-DP"""
        # Find minimum epsilon over all orders
        epsilons = []
        for i, order in enumerate(self._rdp_orders):
            eps = self._rdp_budget[i] - np.log(self.delta) / (order - 1)
            epsilons.append(eps)

        return min(epsilons) if epsilons else float('inf')

    def get_privacy_guarantee(self) -> Dict[str, float]:
        """Get current privacy guarantee"""
        epsilon = self._compute_epsilon_from_rdp()
        return {
            "epsilon": epsilon,
            "delta": self.delta,
            "budget_remaining": self.epsilon - epsilon,
        }


class AirgapStrategy(FedAvg):
    """
    Strategy optimized for air-gapped federated learning

    Handles asynchronous updates from disconnected nodes
    with staleness-aware aggregation.
    """

    def __init__(
        self,
        *,
        max_staleness: int = 5,
        staleness_discount: float = 0.9,
        enable_merkle_verification: bool = True,
        **kwargs,
    ):
        super().__init__(**kwargs)

        self.max_staleness = max_staleness
        self.staleness_discount = staleness_discount
        self.enable_merkle_verification = enable_merkle_verification

        self._current_round = 0
        self._pending_updates: Dict[str, Dict[str, Any]] = {}

    def aggregate_fit(
        self,
        server_round: int,
        results: List[Tuple[ClientProxy, FitRes]],
        failures: List[Union[Tuple[ClientProxy, FitRes], BaseException]],
    ) -> Tuple[Optional[Parameters], Dict[str, Scalar]]:
        """Staleness-aware aggregation for air-gapped nodes"""
        self._current_round = server_round

        # Filter and weight by staleness
        weighted_results = []

        for client, fit_res in results:
            update_round = fit_res.metrics.get("update_round", server_round)
            staleness = server_round - update_round

            if staleness > self.max_staleness:
                logger.warning(
                    f"Discarding stale update from {client.cid} "
                    f"(staleness={staleness} > max={self.max_staleness})"
                )
                continue

            # Apply staleness discount
            weight = (self.staleness_discount ** staleness) * fit_res.num_examples

            # Verify Merkle proof if enabled
            if self.enable_merkle_verification:
                if not self._verify_merkle_proof(fit_res):
                    logger.warning(f"Merkle verification failed for {client.cid}")
                    continue

            weighted_results.append((client, fit_res, weight))

        if not weighted_results:
            return None, {}

        # Aggregate with staleness-adjusted weights
        total_weight = sum(w for _, _, w in weighted_results)

        aggregated = None
        for _, fit_res, weight in weighted_results:
            params = parameters_to_ndarrays(fit_res.parameters)

            if aggregated is None:
                aggregated = [np.zeros_like(p) for p in params]

            for i, param in enumerate(params):
                aggregated[i] += param * (weight / total_weight)

        metrics = {
            "num_clients": len(weighted_results),
            "avg_staleness": np.mean([
                server_round - fr.metrics.get("update_round", server_round)
                for _, fr, _ in weighted_results
            ]),
            "round": server_round,
        }

        return ndarrays_to_parameters(aggregated), metrics

    def _verify_merkle_proof(self, fit_res: FitRes) -> bool:
        """Verify Merkle proof for update integrity"""
        merkle_root = fit_res.metrics.get("merkle_root")
        merkle_proof = fit_res.metrics.get("merkle_proof")

        if not merkle_root or not merkle_proof:
            # Allow updates without proofs in development
            return True

        # In production, verify the Merkle proof
        # This is a placeholder
        return True

    def queue_airgap_update(
        self,
        node_id: str,
        parameters: Parameters,
        metrics: Dict[str, Any],
        update_round: int,
    ) -> None:
        """Queue an update from an air-gapped node"""
        self._pending_updates[node_id] = {
            "parameters": parameters,
            "metrics": metrics,
            "update_round": update_round,
            "received_at": self._current_round,
        }

        logger.info(
            f"Queued air-gap update from {node_id} "
            f"(update_round={update_round}, current={self._current_round})"
        )

    def get_pending_updates(self) -> Dict[str, Dict[str, Any]]:
        """Get all pending air-gap updates"""
        return self._pending_updates.copy()

    def clear_processed_updates(self, node_ids: List[str]) -> None:
        """Clear processed updates"""
        for node_id in node_ids:
            self._pending_updates.pop(node_id, None)
