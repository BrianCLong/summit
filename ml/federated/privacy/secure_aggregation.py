"""
Secure Aggregation for Federated Learning

Implements secret sharing and secure multi-party computation
for privacy-preserving model aggregation.
"""

import hashlib
import logging
import secrets
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class SecretShare:
    """A secret share from Shamir's secret sharing"""

    share_id: int
    node_id: str
    value: np.ndarray
    threshold: int
    total_shares: int
    commitment: str  # Hash commitment for verification


class SecureAggregator:
    """
    Secure Aggregation using Secret Sharing

    Implements privacy-preserving aggregation where:
    - No single party sees individual updates
    - Only the aggregate is revealed
    - Tolerates node dropouts up to threshold
    """

    def __init__(
        self,
        threshold: int = 3,
        prime_bits: int = 127,
    ):
        self.threshold = threshold
        self.prime = self._generate_prime(prime_bits)
        self._pending_shares: Dict[str, List[SecretShare]] = {}

        logger.info(
            f"Secure aggregator initialized - threshold={threshold}"
        )

    def create_shares(
        self,
        secret: np.ndarray,
        node_id: str,
        num_shares: int,
    ) -> List[SecretShare]:
        """
        Create secret shares using Shamir's Secret Sharing

        Args:
            secret: The secret value to share
            node_id: ID of the node creating shares
            num_shares: Total number of shares to create

        Returns:
            List of SecretShare objects
        """
        if num_shares < self.threshold:
            raise ValueError(
                f"num_shares ({num_shares}) must be >= threshold ({self.threshold})"
            )

        shares = []
        flat_secret = secret.flatten()

        # Generate random polynomial coefficients
        coefficients = [flat_secret]
        for _ in range(self.threshold - 1):
            coef = np.array([
                secrets.randbelow(self.prime) for _ in range(len(flat_secret))
            ])
            coefficients.append(coef)

        # Evaluate polynomial at different points
        for i in range(1, num_shares + 1):
            share_value = np.zeros(len(flat_secret), dtype=np.int64)

            for power, coef in enumerate(coefficients):
                term = (coef * pow(i, power, self.prime)) % self.prime
                share_value = (share_value + term) % self.prime

            # Create commitment
            commitment = self._create_commitment(share_value, node_id, i)

            share = SecretShare(
                share_id=i,
                node_id=node_id,
                value=share_value.reshape(secret.shape),
                threshold=self.threshold,
                total_shares=num_shares,
                commitment=commitment,
            )
            shares.append(share)

        logger.debug(f"Created {num_shares} shares for node {node_id}")

        return shares

    def reconstruct_secret(
        self,
        shares: List[SecretShare],
        original_shape: Tuple[int, ...],
    ) -> np.ndarray:
        """
        Reconstruct secret from shares using Lagrange interpolation

        Args:
            shares: List of at least threshold shares
            original_shape: Shape of original secret

        Returns:
            Reconstructed secret
        """
        if len(shares) < self.threshold:
            raise ValueError(
                f"Need at least {self.threshold} shares, got {len(shares)}"
            )

        # Verify commitments
        for share in shares:
            expected = self._create_commitment(
                share.value.flatten(), share.node_id, share.share_id
            )
            if expected != share.commitment:
                raise ValueError(f"Share {share.share_id} failed commitment check")

        # Use Lagrange interpolation to reconstruct
        shares_to_use = shares[: self.threshold]
        x_values = [s.share_id for s in shares_to_use]
        y_values = [s.value.flatten() for s in shares_to_use]

        result = np.zeros(len(y_values[0]), dtype=np.int64)

        for i, (xi, yi) in enumerate(zip(x_values, y_values)):
            # Compute Lagrange basis polynomial
            numerator = 1
            denominator = 1

            for j, xj in enumerate(x_values):
                if i != j:
                    numerator = (numerator * (-xj)) % self.prime
                    denominator = (denominator * (xi - xj)) % self.prime

            # Modular inverse
            lagrange_coef = (numerator * pow(denominator, -1, self.prime)) % self.prime

            result = (result + yi * lagrange_coef) % self.prime

        return result.reshape(original_shape).astype(np.float64)

    def aggregate_with_secret_sharing(
        self,
        updates: Dict[str, np.ndarray],
        dropout_tolerance: float = 0.3,
    ) -> Optional[np.ndarray]:
        """
        Securely aggregate updates using secret sharing

        Each node shares its update with all others, then
        the aggregate is computed without revealing individual values.

        Args:
            updates: Dict mapping node_id to update array
            dropout_tolerance: Fraction of nodes that can drop out

        Returns:
            Aggregated update or None if insufficient participation
        """
        node_ids = list(updates.keys())
        num_nodes = len(node_ids)

        if num_nodes < self.threshold:
            logger.warning(
                f"Insufficient nodes ({num_nodes}) for secure aggregation"
            )
            return None

        # Each node creates shares for all other nodes
        all_shares: Dict[str, List[SecretShare]] = {nid: [] for nid in node_ids}

        for node_id, update in updates.items():
            shares = self.create_shares(update, node_id, num_nodes)

            # Distribute shares to all nodes
            for i, target_node in enumerate(node_ids):
                all_shares[target_node].append(shares[i])

        # Simulate dropout
        dropout_count = int(num_nodes * dropout_tolerance)
        surviving_nodes = node_ids[: num_nodes - dropout_count]

        if len(surviving_nodes) < self.threshold:
            logger.warning("Too many dropouts for reconstruction")
            return None

        # Each surviving node sums their received shares
        local_sums: Dict[str, np.ndarray] = {}

        for node_id in surviving_nodes:
            node_shares = all_shares[node_id]
            local_sum = sum(s.value for s in node_shares)
            local_sums[node_id] = local_sum

        # Reconstruct aggregate from local sums
        # This is the sum of all original values
        shape = list(updates.values())[0].shape
        aggregate_shares = []

        for i, node_id in enumerate(surviving_nodes):
            share = SecretShare(
                share_id=i + 1,
                node_id=node_id,
                value=local_sums[node_id],
                threshold=self.threshold,
                total_shares=len(surviving_nodes),
                commitment=self._create_commitment(
                    local_sums[node_id].flatten(), node_id, i + 1
                ),
            )
            aggregate_shares.append(share)

        # Reconstruct sum
        try:
            total_sum = self.reconstruct_secret(aggregate_shares, shape)
            # Return mean
            return total_sum / num_nodes
        except Exception as e:
            logger.error(f"Reconstruction failed: {e}")
            return None

    def pairwise_masking_aggregate(
        self,
        updates: Dict[str, np.ndarray],
    ) -> np.ndarray:
        """
        Aggregate using pairwise random masks

        Simpler than full secret sharing but still provides
        privacy by masking individual contributions.
        """
        node_ids = sorted(updates.keys())
        num_nodes = len(node_ids)
        shape = list(updates.values())[0].shape

        # Generate pairwise masks
        masked_updates = {}

        for i, node_i in enumerate(node_ids):
            masked = updates[node_i].copy()

            for j, node_j in enumerate(node_ids):
                if i < j:
                    # Generate deterministic mask from node pair
                    seed = self._pairwise_seed(node_i, node_j)
                    rng = np.random.RandomState(seed)
                    mask = rng.randn(*shape)
                    masked = masked + mask
                elif i > j:
                    # Subtract the same mask
                    seed = self._pairwise_seed(node_j, node_i)
                    rng = np.random.RandomState(seed)
                    mask = rng.randn(*shape)
                    masked = masked - mask

            masked_updates[node_i] = masked

        # Sum masked updates - masks cancel out
        aggregate = sum(masked_updates.values()) / num_nodes

        return aggregate

    def _generate_prime(self, bits: int) -> int:
        """Generate a prime number with specified bits"""
        # Use a known large prime for efficiency
        known_primes = {
            127: 2**127 - 1,  # Mersenne prime
            61: 2**61 - 1,    # Mersenne prime
            31: 2**31 - 1,    # Mersenne prime
        }
        return known_primes.get(bits, 2**61 - 1)

    def _create_commitment(
        self,
        value: np.ndarray,
        node_id: str,
        share_id: int,
    ) -> str:
        """Create hash commitment for share verification"""
        data = f"{node_id}:{share_id}:{value.tobytes().hex()}"
        return hashlib.sha256(data.encode()).hexdigest()

    def _pairwise_seed(self, node_a: str, node_b: str) -> int:
        """Generate deterministic seed for node pair"""
        combined = f"{node_a}:{node_b}"
        hash_bytes = hashlib.sha256(combined.encode()).digest()
        return int.from_bytes(hash_bytes[:4], byteorder="big")
