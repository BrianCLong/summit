"""
pgvector Differential Privacy Integration

Implements privacy-preserving embedding storage and retrieval
using PostgreSQL pgvector extension with differential privacy.
"""

import logging
import hashlib
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class PrivacyConfig:
    """Configuration for differential privacy"""

    epsilon: float = 1.0
    delta: float = 1e-5
    clip_norm: float = 1.0
    noise_mechanism: str = "gaussian"  # gaussian or laplace
    sensitivity: float = 1.0
    embedding_dimension: int = 768
    min_aggregation_count: int = 3


@dataclass
class EmbeddingWithPrivacy:
    """Embedding with privacy metadata"""

    embedding_id: str
    vector: np.ndarray
    privacy_epsilon_used: float
    noise_added: bool
    source_count: int
    timestamp: float
    metadata: Dict[str, Any] = field(default_factory=dict)


class PgVectorDifferentialPrivacy:
    """
    Differential Privacy for pgvector embeddings

    Provides:
    - Private embedding aggregation
    - Noise-calibrated vector storage
    - Privacy budget tracking
    - Secure similarity search
    """

    def __init__(
        self,
        config: PrivacyConfig,
        connection_string: Optional[str] = None,
    ):
        self.config = config
        self.connection_string = connection_string
        self._connection = None

        # Privacy tracking
        self._total_epsilon_spent = 0.0
        self._operation_log: List[Dict[str, Any]] = []

        # Initialize connection if provided
        if connection_string:
            self._init_connection()

        logger.info(
            f"PgVector DP initialized - epsilon={config.epsilon}, "
            f"delta={config.delta}, mechanism={config.noise_mechanism}"
        )

    def _init_connection(self) -> None:
        """Initialize PostgreSQL connection with pgvector"""
        try:
            import psycopg2
            from pgvector.psycopg2 import register_vector

            self._connection = psycopg2.connect(self.connection_string)
            register_vector(self._connection)

            # Ensure pgvector extension and tables exist
            self._setup_tables()

            logger.info("Connected to PostgreSQL with pgvector")

        except ImportError:
            logger.warning(
                "psycopg2 or pgvector not available - "
                "running in simulation mode"
            )
        except Exception as e:
            logger.error(f"Failed to connect to PostgreSQL: {e}")

    def _setup_tables(self) -> None:
        """Setup required tables for private embeddings"""
        if self._connection is None:
            return

        with self._connection.cursor() as cur:
            # Ensure pgvector extension
            cur.execute("CREATE EXTENSION IF NOT EXISTS vector")

            # Create private embeddings table
            cur.execute(f"""
                CREATE TABLE IF NOT EXISTS federated_embeddings (
                    id TEXT PRIMARY KEY,
                    embedding vector({self.config.embedding_dimension}),
                    privacy_epsilon FLOAT NOT NULL,
                    noise_added BOOLEAN DEFAULT true,
                    source_count INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    metadata JSONB DEFAULT '{{}}'
                )
            """)

            # Create index for similarity search
            cur.execute("""
                CREATE INDEX IF NOT EXISTS federated_embeddings_vector_idx
                ON federated_embeddings
                USING ivfflat (embedding vector_cosine_ops)
                WITH (lists = 100)
            """)

            # Create privacy audit table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS embedding_privacy_audit (
                    id SERIAL PRIMARY KEY,
                    operation TEXT NOT NULL,
                    embedding_id TEXT,
                    epsilon_spent FLOAT NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    metadata JSONB DEFAULT '{}'
                )
            """)

            self._connection.commit()

    def add_noise_to_embedding(
        self,
        embedding: np.ndarray,
        epsilon: Optional[float] = None,
    ) -> Tuple[np.ndarray, float]:
        """
        Add calibrated noise to embedding for differential privacy

        Returns:
            Tuple of (noised_embedding, epsilon_spent)
        """
        epsilon = epsilon or self.config.epsilon

        # Clip embedding to bound sensitivity
        clipped = self._clip_embedding(embedding)

        # Add noise based on mechanism
        if self.config.noise_mechanism == "gaussian":
            noised = self._add_gaussian_noise(clipped, epsilon)
        else:
            noised = self._add_laplace_noise(clipped, epsilon)

        # Track privacy spending
        self._total_epsilon_spent += epsilon
        self._log_operation("add_noise", epsilon)

        return noised, epsilon

    def aggregate_embeddings_private(
        self,
        embeddings: List[np.ndarray],
        epsilon: Optional[float] = None,
    ) -> Tuple[np.ndarray, float]:
        """
        Privately aggregate multiple embeddings

        Uses noise addition after averaging to provide DP guarantee.
        """
        if len(embeddings) < self.config.min_aggregation_count:
            raise ValueError(
                f"Minimum {self.config.min_aggregation_count} embeddings "
                f"required for private aggregation"
            )

        epsilon = epsilon or self.config.epsilon

        # Clip all embeddings
        clipped = [self._clip_embedding(e) for e in embeddings]

        # Compute mean
        mean_embedding = np.mean(clipped, axis=0)

        # Add noise calibrated for aggregation
        # Sensitivity is reduced by factor of n for mean
        adjusted_sensitivity = self.config.sensitivity / len(embeddings)

        if self.config.noise_mechanism == "gaussian":
            sigma = self._compute_gaussian_sigma(adjusted_sensitivity, epsilon)
            noise = np.random.normal(0, sigma, mean_embedding.shape)
        else:
            scale = adjusted_sensitivity / epsilon
            noise = np.random.laplace(0, scale, mean_embedding.shape)

        noised_mean = mean_embedding + noise

        # Normalize to unit sphere
        norm = np.linalg.norm(noised_mean)
        if norm > 0:
            noised_mean = noised_mean / norm

        self._total_epsilon_spent += epsilon
        self._log_operation("aggregate", epsilon, {"num_embeddings": len(embeddings)})

        return noised_mean, epsilon

    def store_private_embedding(
        self,
        embedding_id: str,
        embedding: np.ndarray,
        add_noise: bool = True,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> EmbeddingWithPrivacy:
        """Store embedding with privacy protection"""
        epsilon_used = 0.0

        if add_noise:
            stored_embedding, epsilon_used = self.add_noise_to_embedding(embedding)
        else:
            stored_embedding = self._clip_embedding(embedding)

        result = EmbeddingWithPrivacy(
            embedding_id=embedding_id,
            vector=stored_embedding,
            privacy_epsilon_used=epsilon_used,
            noise_added=add_noise,
            source_count=1,
            timestamp=time.time(),
            metadata=metadata or {},
        )

        # Store in PostgreSQL if connected
        if self._connection is not None:
            self._store_embedding_pg(result)

        return result

    def private_similarity_search(
        self,
        query_embedding: np.ndarray,
        k: int = 10,
        add_query_noise: bool = True,
        epsilon: Optional[float] = None,
    ) -> List[Tuple[str, float]]:
        """
        Perform privacy-preserving similarity search

        Adds noise to query to prevent inference attacks.
        """
        epsilon = epsilon or self.config.epsilon / 10  # Use less budget for queries

        # Optionally add noise to query
        if add_query_noise:
            query_noised, _ = self.add_noise_to_embedding(query_embedding, epsilon)
        else:
            query_noised = query_embedding

        if self._connection is None:
            logger.warning("No database connection - returning empty results")
            return []

        # Perform similarity search
        with self._connection.cursor() as cur:
            cur.execute(
                """
                SELECT id, 1 - (embedding <=> %s::vector) as similarity
                FROM federated_embeddings
                ORDER BY embedding <=> %s::vector
                LIMIT %s
                """,
                (query_noised.tolist(), query_noised.tolist(), k),
            )

            results = [(row[0], row[1]) for row in cur.fetchall()]

        self._log_operation(
            "similarity_search",
            epsilon if add_query_noise else 0,
            {"k": k, "query_noised": add_query_noise},
        )

        return results

    def federated_embedding_update(
        self,
        embedding_id: str,
        local_updates: List[np.ndarray],
        node_ids: List[str],
    ) -> EmbeddingWithPrivacy:
        """
        Update embedding with federated contributions

        Aggregates updates from multiple nodes with privacy guarantees.
        """
        if len(local_updates) != len(node_ids):
            raise ValueError("Number of updates must match number of node IDs")

        # Aggregate with privacy
        aggregated, epsilon_used = self.aggregate_embeddings_private(local_updates)

        result = EmbeddingWithPrivacy(
            embedding_id=embedding_id,
            vector=aggregated,
            privacy_epsilon_used=epsilon_used,
            noise_added=True,
            source_count=len(local_updates),
            timestamp=time.time(),
            metadata={
                "contributing_nodes": node_ids,
                "aggregation_method": "federated_mean",
            },
        )

        # Update in PostgreSQL
        if self._connection is not None:
            self._update_embedding_pg(result)

        return result

    def get_privacy_report(self) -> Dict[str, Any]:
        """Get privacy budget usage report"""
        return {
            "config": {
                "total_epsilon": self.config.epsilon,
                "delta": self.config.delta,
                "mechanism": self.config.noise_mechanism,
                "clip_norm": self.config.clip_norm,
            },
            "usage": {
                "epsilon_spent": self._total_epsilon_spent,
                "epsilon_remaining": self.config.epsilon - self._total_epsilon_spent,
                "budget_exhausted": self._total_epsilon_spent >= self.config.epsilon,
            },
            "operations": len(self._operation_log),
            "recent_operations": self._operation_log[-10:],
        }

    def _clip_embedding(self, embedding: np.ndarray) -> np.ndarray:
        """Clip embedding to bound sensitivity"""
        norm = np.linalg.norm(embedding)
        if norm > self.config.clip_norm:
            return embedding * (self.config.clip_norm / norm)
        return embedding.copy()

    def _add_gaussian_noise(
        self,
        embedding: np.ndarray,
        epsilon: float,
    ) -> np.ndarray:
        """Add Gaussian noise for (epsilon, delta)-DP"""
        sigma = self._compute_gaussian_sigma(self.config.sensitivity, epsilon)
        noise = np.random.normal(0, sigma, embedding.shape)
        return embedding + noise

    def _add_laplace_noise(
        self,
        embedding: np.ndarray,
        epsilon: float,
    ) -> np.ndarray:
        """Add Laplace noise for epsilon-DP"""
        scale = self.config.sensitivity / epsilon
        noise = np.random.laplace(0, scale, embedding.shape)
        return embedding + noise

    def _compute_gaussian_sigma(
        self,
        sensitivity: float,
        epsilon: float,
    ) -> float:
        """Compute Gaussian noise scale for target epsilon"""
        # Gaussian mechanism: sigma = sensitivity * sqrt(2 * ln(1.25/delta)) / epsilon
        return (
            sensitivity
            * np.sqrt(2 * np.log(1.25 / self.config.delta))
            / epsilon
        )

    def _store_embedding_pg(self, embedding: EmbeddingWithPrivacy) -> None:
        """Store embedding in PostgreSQL"""
        import json

        with self._connection.cursor() as cur:
            cur.execute(
                """
                INSERT INTO federated_embeddings
                (id, embedding, privacy_epsilon, noise_added, source_count, metadata)
                VALUES (%s, %s::vector, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    embedding = EXCLUDED.embedding,
                    privacy_epsilon = federated_embeddings.privacy_epsilon + EXCLUDED.privacy_epsilon,
                    source_count = EXCLUDED.source_count
                """,
                (
                    embedding.embedding_id,
                    embedding.vector.tolist(),
                    embedding.privacy_epsilon_used,
                    embedding.noise_added,
                    embedding.source_count,
                    json.dumps(embedding.metadata),
                ),
            )

            # Audit log
            cur.execute(
                """
                INSERT INTO embedding_privacy_audit
                (operation, embedding_id, epsilon_spent, metadata)
                VALUES (%s, %s, %s, %s)
                """,
                (
                    "store",
                    embedding.embedding_id,
                    embedding.privacy_epsilon_used,
                    json.dumps(embedding.metadata),
                ),
            )

            self._connection.commit()

    def _update_embedding_pg(self, embedding: EmbeddingWithPrivacy) -> None:
        """Update embedding in PostgreSQL"""
        self._store_embedding_pg(embedding)

    def _log_operation(
        self,
        operation: str,
        epsilon: float,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Log privacy operation"""
        self._operation_log.append({
            "operation": operation,
            "epsilon": epsilon,
            "timestamp": time.time(),
            "metadata": metadata or {},
        })

    def can_afford_operation(self, epsilon: float) -> bool:
        """Check if privacy budget allows operation"""
        return self._total_epsilon_spent + epsilon <= self.config.epsilon

    def reset_budget(self) -> None:
        """Reset privacy budget (use with caution)"""
        logger.warning("Resetting privacy budget - this may compromise privacy!")
        self._total_epsilon_spent = 0.0
        self._operation_log.clear()
