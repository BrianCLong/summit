"""Policy enforcement for structured retrieval."""

from __future__ import annotations

from dataclasses import dataclass

from .config import StructuredRagConfig
from .types import PolicyDecision, QueryPlan


@dataclass(frozen=True)
class StructuredPolicy:
    """Validates QueryPlan before execution."""

    config: StructuredRagConfig

    def validate(self, plan: QueryPlan) -> PolicyDecision:
        reasons: list[str] = []
        if not plan.sql.strip().upper().startswith("SELECT "):
            reasons.append("Only SELECT statements are permitted")

        if plan.limit <= 0:
            reasons.append("Limit must be positive")
        if plan.limit > self.config.budgets.max_rows:
            reasons.append("Limit exceeds max_rows budget")

        if self.config.tenant is not None:
            tenant_column = self.config.tenant.column
            if tenant_column not in plan.filters:
                reasons.append("Tenant filter is required")
            elif plan.filters.get(tenant_column) != self.config.tenant.value:
                reasons.append("Tenant filter value mismatch")

        allowed = len(reasons) == 0
        return PolicyDecision(allowed=allowed, reasons=reasons)
