"""
Privacy Accountant for Federated Learning

Implements Rényi Differential Privacy (RDP) accounting
for precise privacy budget tracking across training rounds.
"""

import logging
import math
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


class CompositionTheorem(Enum):
    """Privacy composition theorems"""

    BASIC = "basic"  # Simple sum of epsilons
    ADVANCED = "advanced"  # Strong composition
    RENYI = "renyi"  # Rényi DP composition (tightest)
    MOMENTS = "moments"  # Moments accountant


@dataclass
class PrivacyLedgerEntry:
    """Entry in privacy ledger"""

    round_number: int
    operation: str
    epsilon: float
    delta: float
    noise_multiplier: float
    sample_rate: float
    timestamp: float
    metadata: Dict[str, Any] = field(default_factory=dict)


class RenyiDPAccountant:
    """
    Rényi Differential Privacy Accountant

    Provides tight privacy accounting using:
    - Rényi DP composition
    - Moments accountant conversion
    - Privacy amplification by subsampling
    """

    def __init__(
        self,
        total_epsilon: float = 1.0,
        total_delta: float = 1e-5,
        composition: CompositionTheorem = CompositionTheorem.RENYI,
    ):
        self.total_epsilon = total_epsilon
        self.total_delta = total_delta
        self.composition = composition

        # RDP orders for moments accountant
        self._rdp_orders = np.array([
            1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 8.0,
            10.0, 12.0, 16.0, 20.0, 32.0, 64.0, 128.0, 256.0, 512.0, 1024.0
        ])

        # Accumulated RDP at each order
        self._rdp_budget = np.zeros_like(self._rdp_orders)

        # Privacy ledger
        self._ledger: List[PrivacyLedgerEntry] = []

        logger.info(
            f"RDP accountant initialized - epsilon={total_epsilon}, "
            f"delta={total_delta}, composition={composition.value}"
        )

    def compute_rdp_gaussian(
        self,
        noise_multiplier: float,
        sample_rate: float,
    ) -> np.ndarray:
        """
        Compute RDP for Gaussian mechanism with subsampling

        Uses the privacy amplification by subsampling theorem.
        """
        if noise_multiplier <= 0:
            return np.full_like(self._rdp_orders, np.inf)

        rdp = np.zeros_like(self._rdp_orders)

        for i, order in enumerate(self._rdp_orders):
            if sample_rate == 1.0:
                # No subsampling
                rdp[i] = order / (2 * noise_multiplier ** 2)
            else:
                # Privacy amplification by subsampling
                rdp[i] = self._compute_rdp_subsampled_gaussian(
                    order, noise_multiplier, sample_rate
                )

        return rdp

    def _compute_rdp_subsampled_gaussian(
        self,
        order: float,
        noise_multiplier: float,
        sample_rate: float,
    ) -> float:
        """Compute RDP for subsampled Gaussian mechanism"""
        if order <= 1:
            return 0.0

        # Approximation for subsampled Gaussian (Mironov et al.)
        if sample_rate <= 0:
            return 0.0

        # Tight bound from "Rényi Differential Privacy of the Sampled Gaussian"
        log_term = 0.0
        for k in range(2, int(order) + 1):
            log_binom = self._log_binomial(order, k)
            log_moment = k * (k - 1) / (2 * noise_multiplier ** 2)
            log_term = self._log_sum_exp(
                log_term,
                log_binom + k * np.log(sample_rate) + (order - k) * np.log(1 - sample_rate) + log_moment
            )

        return log_term / (order - 1)

    def record_step(
        self,
        noise_multiplier: float,
        sample_rate: float,
        round_number: int = 0,
        operation: str = "training_step",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> float:
        """
        Record a privacy-consuming step

        Returns current epsilon after this step.
        """
        # Compute RDP for this step
        step_rdp = self.compute_rdp_gaussian(noise_multiplier, sample_rate)

        # Add to accumulated budget
        self._rdp_budget += step_rdp

        # Convert to (epsilon, delta)-DP
        current_epsilon = self.get_epsilon(self.total_delta)

        # Record in ledger
        import time
        entry = PrivacyLedgerEntry(
            round_number=round_number,
            operation=operation,
            epsilon=current_epsilon,
            delta=self.total_delta,
            noise_multiplier=noise_multiplier,
            sample_rate=sample_rate,
            timestamp=time.time(),
            metadata=metadata or {},
        )
        self._ledger.append(entry)

        logger.debug(
            f"Recorded step - epsilon={current_epsilon:.4f}, "
            f"noise_mult={noise_multiplier:.2f}, sample_rate={sample_rate:.4f}"
        )

        return current_epsilon

    def get_epsilon(self, delta: float) -> float:
        """Convert RDP to (epsilon, delta)-DP"""
        if self.composition == CompositionTheorem.BASIC:
            return self._basic_composition_epsilon()
        elif self.composition == CompositionTheorem.ADVANCED:
            return self._advanced_composition_epsilon(delta)
        else:
            return self._rdp_to_epsilon_delta(delta)

    def _rdp_to_epsilon_delta(self, delta: float) -> float:
        """Convert RDP to (epsilon, delta)-DP using optimal order"""
        if delta <= 0:
            return float('inf')

        # Find optimal order
        epsilons = (
            self._rdp_budget - np.log(delta) / (self._rdp_orders - 1)
        )

        # Filter out invalid values
        valid_mask = (self._rdp_orders > 1) & np.isfinite(epsilons) & (epsilons >= 0)

        if not np.any(valid_mask):
            return float('inf')

        return float(np.min(epsilons[valid_mask]))

    def _basic_composition_epsilon(self) -> float:
        """Basic composition: sum of epsilons"""
        return sum(entry.epsilon for entry in self._ledger)

    def _advanced_composition_epsilon(self, delta: float) -> float:
        """Advanced composition theorem"""
        if not self._ledger:
            return 0.0

        k = len(self._ledger)
        eps_sum = sum(entry.epsilon for entry in self._ledger)
        eps_sq_sum = sum(entry.epsilon ** 2 for entry in self._ledger)

        # Strong composition
        return min(
            eps_sum,
            np.sqrt(2 * k * np.log(1 / delta)) * np.sqrt(eps_sq_sum) + eps_sq_sum / 3
        )

    def get_remaining_budget(self) -> float:
        """Get remaining privacy budget"""
        current_epsilon = self.get_epsilon(self.total_delta)
        return max(0, self.total_epsilon - current_epsilon)

    def is_budget_exhausted(self) -> bool:
        """Check if privacy budget is exhausted"""
        return self.get_epsilon(self.total_delta) >= self.total_epsilon

    def can_afford_step(
        self,
        noise_multiplier: float,
        sample_rate: float,
    ) -> bool:
        """Check if budget allows another step with given parameters"""
        # Simulate the step
        step_rdp = self.compute_rdp_gaussian(noise_multiplier, sample_rate)
        hypothetical_budget = self._rdp_budget + step_rdp

        # Convert to epsilon
        epsilons = (
            hypothetical_budget - np.log(self.total_delta) / (self._rdp_orders - 1)
        )
        valid_mask = (self._rdp_orders > 1) & np.isfinite(epsilons) & (epsilons >= 0)

        if not np.any(valid_mask):
            return False

        hypothetical_epsilon = float(np.min(epsilons[valid_mask]))

        return hypothetical_epsilon <= self.total_epsilon

    def compute_noise_multiplier_for_budget(
        self,
        target_epsilon: float,
        num_steps: int,
        sample_rate: float,
        delta: Optional[float] = None,
    ) -> float:
        """
        Compute required noise multiplier to achieve target epsilon

        Binary search for the noise multiplier.
        """
        delta = delta or self.total_delta

        low, high = 0.1, 100.0

        while high - low > 0.01:
            mid = (low + high) / 2

            # Simulate training
            test_accountant = RenyiDPAccountant(
                total_epsilon=float('inf'),
                total_delta=delta,
            )

            for _ in range(num_steps):
                test_accountant.record_step(mid, sample_rate)

            achieved_epsilon = test_accountant.get_epsilon(delta)

            if achieved_epsilon < target_epsilon:
                high = mid
            else:
                low = mid

        return high

    def get_ledger(self) -> List[PrivacyLedgerEntry]:
        """Get privacy ledger"""
        return self._ledger.copy()

    def get_summary(self) -> Dict[str, Any]:
        """Get privacy accounting summary"""
        current_epsilon = self.get_epsilon(self.total_delta)

        return {
            "total_epsilon_budget": self.total_epsilon,
            "total_delta": self.total_delta,
            "current_epsilon": current_epsilon,
            "remaining_epsilon": max(0, self.total_epsilon - current_epsilon),
            "budget_used_fraction": current_epsilon / self.total_epsilon,
            "num_steps": len(self._ledger),
            "composition_method": self.composition.value,
            "rdp_orders_used": len(self._rdp_orders),
        }

    def reset(self) -> None:
        """Reset accountant (use with caution)"""
        logger.warning("Resetting privacy accountant - privacy guarantees reset!")
        self._rdp_budget = np.zeros_like(self._rdp_orders)
        self._ledger.clear()

    def _log_binomial(self, n: float, k: int) -> float:
        """Compute log of binomial coefficient"""
        return math.lgamma(n + 1) - math.lgamma(k + 1) - math.lgamma(n - k + 1)

    def _log_sum_exp(self, a: float, b: float) -> float:
        """Compute log(exp(a) + exp(b)) stably"""
        if a == float('-inf'):
            return b
        if b == float('-inf'):
            return a
        if a > b:
            return a + np.log1p(np.exp(b - a))
        return b + np.log1p(np.exp(a - b))


def create_accountant_for_training(
    target_epsilon: float,
    target_delta: float,
    num_rounds: int,
    clients_per_round: int,
    total_clients: int,
    batch_size: int,
    dataset_size: int,
) -> Tuple[RenyiDPAccountant, float]:
    """
    Create accountant with computed noise multiplier for training

    Returns accountant and required noise multiplier.
    """
    sample_rate = clients_per_round / total_clients * batch_size / dataset_size

    accountant = RenyiDPAccountant(
        total_epsilon=target_epsilon,
        total_delta=target_delta,
    )

    noise_multiplier = accountant.compute_noise_multiplier_for_budget(
        target_epsilon=target_epsilon,
        num_steps=num_rounds,
        sample_rate=sample_rate,
        delta=target_delta,
    )

    return accountant, noise_multiplier
