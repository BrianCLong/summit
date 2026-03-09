import uuid
from typing import Dict, Any, Optional
from services.graphrag_api.models.reasoning_budget import ReasoningBudget

class TraceContext:
    def __init__(self, tenant_id: str, budget: ReasoningBudget, trace_id: Optional[str] = None):
        self.tenant_id = tenant_id
        self.budget = budget
        self.trace_id = trace_id or str(uuid.uuid4())

class BudgetEnforcer:
    def __init__(self, tenant_policies: Optional[Dict[str, Any]] = None):
        # In a real app, this would load from a DB or config service
        self.tenant_policies = tenant_policies or {
            "default": {"max_allowed_hops": 5, "max_allowed_nodes": 1000},
            "strict_tenant": {"max_allowed_hops": 2, "max_allowed_nodes": 100}
        }

    def enforce(self, tenant_id: str, budget: ReasoningBudget) -> TraceContext:
        """
        Validates the budget against tenant limits and returns a TraceContext.
        """
        policy = self.tenant_policies.get(tenant_id, self.tenant_policies.get("default", {}))

        # Cap exploration hops
        limit_hops = policy.get("max_allowed_hops")
        if limit_hops and budget.explore.max_hops > limit_hops:
            budget.explore.max_hops = limit_hops

        # Cap exploration nodes
        limit_nodes = policy.get("max_allowed_nodes")
        if limit_nodes and budget.explore.max_nodes > limit_nodes:
            budget.explore.max_nodes = limit_nodes

        return TraceContext(tenant_id=tenant_id, budget=budget)
