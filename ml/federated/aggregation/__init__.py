"""
Aggregation Module for Federated Learning

Implements Neo4j-based aggregation for graph-aware
federated learning result storage and querying.
"""

from .graph_merger import (
    GraphMerger,
    MergeStrategy,
)
from .neo4j_aggregator import (
    AggregationConfig,
    FederatedGraphResult,
    Neo4jAggregator,
)

__all__ = [
    "AggregationConfig",
    "FederatedGraphResult",
    "GraphMerger",
    "MergeStrategy",
    "Neo4jAggregator",
]
