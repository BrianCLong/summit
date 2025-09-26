from __future__ import annotations

from typing import Any, Dict, Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


class PostgresOptions(BaseModel):
    """Configuration for PostgreSQL ingestion jobs."""

    table: str | None = None
    query: str | None = None
    index_column: str | None = Field(default=None, alias="indexColumn")
    npartitions: int = Field(default=4, alias="nPartitions")
    feature_columns: list[str] | None = Field(default=None, alias="featureColumns")


class IngestJobRequest(BaseModel):
    """Request model for starting an ingestion job."""

    model_config = ConfigDict(populate_by_name=True)

    source_type: Literal["csv", "json", "s3", "postgres"] = Field(alias="sourceType")
    source: str
    schema_map: Dict[str, str] = Field(alias="schemaMap")
    redaction_rules: Dict[str, str] = Field(default_factory=dict, alias="redactionRules")
    postgres: PostgresOptions | None = Field(default=None, alias="postgresOptions")


class JobStatus(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    status: Literal["pending", "completed", "failed"]
    processed: int = 0
    pii_summary: Dict[str, int] = Field(default_factory=dict, alias="piiSummary")
    quality_insights: Dict[str, Any] | None = Field(default=None, alias="qualityInsights")


class EventEnvelope(BaseModel):
    tenantId: str
    entityType: str
    attributes: Dict[str, Any]
    provenance: Dict[str, Any]
    policy: Dict[str, Any]


def new_job_id() -> str:
    return uuid4().hex
