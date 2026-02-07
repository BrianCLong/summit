from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass(frozen=True)
class CanonicalizationConfig:
    null: str = '__NULL__'
    date_format: str = 'iso8601'
    tz: str = 'UTC'
    float_round: int = 8


@dataclass(frozen=True)
class SamplingPgConfig:
    method: str = 'tablesample_system'
    percent: float = 5.0
    repeatable: bool = True


@dataclass(frozen=True)
class SamplingNeo4jConfig:
    id_fetch_batch: int = 1000


@dataclass(frozen=True)
class SamplingConfig:
    per_entity: int = 5000
    per_link: int = 10000
    pg: SamplingPgConfig = field(default_factory=SamplingPgConfig)
    neo4j: SamplingNeo4jConfig = field(default_factory=SamplingNeo4jConfig)


@dataclass(frozen=True)
class PerformanceConfig:
    pg_statement_timeout_ms: int = 20000
    neo4j_tx_timeout_ms: int = 20000


@dataclass(frozen=True)
class RedactionConfig:
    sample_diff_max_rows: int = 200
    redact_props: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class SloConfig:
    node_mismatch_pct: float = 0.1
    prop_hash_drift_pct: float = 0.05
    min_degree_pvalue: float = 0.01
    ri_violations_max: int = 0


@dataclass(frozen=True)
class EntityMapping:
    name: str
    pg_table: str
    pg_pk: str
    neo4j_label: str
    neo4j_key: str
    props: list[str]


@dataclass(frozen=True)
class LinkMapping:
    name: str
    pg_table: str
    pg_fk_from: str
    pg_fk_to: str
    neo4j_rel_type: str
    from_label: str
    to_label: str
    props: list[str]


@dataclass(frozen=True)
class Mapping:
    version: int
    seed: str
    canonicalization: CanonicalizationConfig
    sampling: SamplingConfig
    performance: PerformanceConfig
    redaction: RedactionConfig
    slo: SloConfig
    entities: list[EntityMapping]
    links: list[LinkMapping]
    metadata: dict[str, Any] = field(default_factory=dict)
    tenant: Optional[str] = None
