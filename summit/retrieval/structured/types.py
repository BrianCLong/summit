"""Types for structured retrieval pipeline."""

from dataclasses import dataclass, field
from typing import Dict, List, Mapping, Optional, Sequence, Tuple


@dataclass(frozen=True)
class Column:
    name: str
    data_type: str
    nullable: bool = True


@dataclass(frozen=True)
class Table:
    name: str
    columns: Sequence[Column]
    primary_key: Optional[Sequence[str]] = None
    foreign_keys: Dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class Schema:
    tables: Sequence[Table]
    version: Optional[str] = None

    def table_names(self) -> Sequence[str]:
        return [table.name for table in self.tables]

    def table(self, name: str) -> Table:
        for table in self.tables:
            if table.name == name:
                return table
        raise KeyError(f"Unknown table: {name}")


@dataclass(frozen=True)
class StructuredQueryRequest:
    table: str
    select: Sequence[str]
    filters: Mapping[str, object] = field(default_factory=dict)
    aggregations: Mapping[str, Tuple[str, str]] = field(default_factory=dict)
    group_by: Sequence[str] = field(default_factory=list)
    limit: int = 100
    order_by: Sequence[str] = field(default_factory=list)
    expect_single: bool = False


@dataclass(frozen=True)
class QueryPlan:
    table: str
    select: Sequence[str]
    filters: Mapping[str, object]
    aggregations: Mapping[str, Tuple[str, str]]
    group_by: Sequence[str]
    limit: int
    order_by: Sequence[str]
    sql: str
    params: Sequence[object]
    expect_single: bool


@dataclass(frozen=True)
class ExecutionResult:
    rows: Sequence[Dict[str, object]]
    row_count: int
    bytes: int


@dataclass(frozen=True)
class PolicyDecision:
    allowed: bool
    reasons: List[str] = field(default_factory=list)
