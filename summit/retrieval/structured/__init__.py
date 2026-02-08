"""Structured retrieval pipeline (SQL-first).

Feature-flagged via SUMMIT_STRUCTURED_RAG.
"""

from .config import AllowlistConfig, BudgetConfig, StructuredRagConfig, TenantConfig
from .types import (
    ExecutionResult,
    PolicyDecision,
    QueryPlan,
    Schema,
    StructuredQueryRequest,
)
from .planner import PlanError, StructuredPlanner
from .policy import StructuredPolicy
from .executor import DisambiguationRequired, NotFound, StructuredExecutor
from .schema_introspect import SchemaIntrospector
from .pipeline import PolicyViolation, StructuredRetrievalPipeline

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
