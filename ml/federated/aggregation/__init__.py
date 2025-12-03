"""
Aggregation Module for Federated Learning

Implements Neo4j-based aggregation for graph-aware
federated learning result storage and querying.
"""

from .neo4j_aggregator import (
    Neo4jAggregator,
    AggregationConfig,
    FederatedGraphResult,
)
from .graph_merger import (
    GraphMerger,
    MergeStrategy,
)

__all__ = [
    "Neo4jAggregator",
    "AggregationConfig",
    "FederatedGraphResult",
    "GraphMerger",
    "MergeStrategy",
]
