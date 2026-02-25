"""Structured retrieval pipeline (SQL-first).

Feature-flagged via SUMMIT_STRUCTURED_RAG.
"""

from .config import AllowlistConfig, BudgetConfig, StructuredRagConfig, TenantConfig
from .executor import DisambiguationRequired, NotFound, StructuredExecutor
from .pipeline import PolicyViolation, StructuredRetrievalPipeline
from .planner import PlanError, StructuredPlanner
from .policy import StructuredPolicy
from .schema_introspect import SchemaIntrospector
from .types import (
    ExecutionResult,
    PolicyDecision,
    QueryPlan,
    Schema,
    StructuredQueryRequest,
)

__all__ = [
    "AllowlistConfig",
    "BudgetConfig",
    "StructuredRagConfig",
    "TenantConfig",
    "ExecutionResult",
    "QueryPlan",
    "Schema",
    "PolicyDecision",
    "StructuredQueryRequest",
    "PlanError",
    "StructuredPlanner",
    "StructuredPolicy",
    "DisambiguationRequired",
    "NotFound",
    "StructuredExecutor",
    "SchemaIntrospector",
    "PolicyViolation",
    "StructuredRetrievalPipeline",
]
