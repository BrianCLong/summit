"""Configuration for structured retrieval."""

from dataclasses import dataclass, field
from typing import Mapping, Sequence


@dataclass(frozen=True)
class AllowlistConfig:
    tables: Mapping[str, Sequence[str]]

    def is_table_allowed(self, table: str) -> bool:
        return table in self.tables

    def allowed_columns(self, table: str) -> Sequence[str]:
        return self.tables.get(table, [])


@dataclass(frozen=True)
class TenantConfig:
    column: str
    value: object


@dataclass(frozen=True)
class BudgetConfig:
    max_rows: int = 200
    max_bytes: int = 262144


@dataclass(frozen=True)
class StructuredRagConfig:
    allowlist: AllowlistConfig
    budgets: BudgetConfig = field(default_factory=BudgetConfig)
    tenant: TenantConfig | None = None
    evidence_root: str = "artifacts/structured-rag-db-not-docs"
    item_slug: str = "structured-rag-db-not-docs"
