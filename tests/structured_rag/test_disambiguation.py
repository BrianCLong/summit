import pytest

from summit.retrieval.structured import (
    AllowlistConfig,
    BudgetConfig,
    DisambiguationRequired,
    StructuredRagConfig,
    StructuredQueryRequest,
    StructuredRetrievalPipeline,
    TenantConfig,
)


def _config() -> StructuredRagConfig:
    return StructuredRagConfig(
        allowlist=AllowlistConfig(
            tables={
                "customers": ["id", "name", "email", "tenant_id", "created_date"],
                "orders": ["id", "customer_id", "amount", "date", "tenant_id"],
            }
        ),
        budgets=BudgetConfig(max_rows=200, max_bytes=262144),
        tenant=TenantConfig(column="tenant_id", value="tenant-a"),
    )


def test_disambiguation_requires_unique(sqlite_db):
    pipeline = StructuredRetrievalPipeline(config=_config(), connection=sqlite_db)
    request = StructuredQueryRequest(
        table="customers",
        select=["id", "name", "email", "tenant_id"],
        filters={"name": "John Doe", "tenant_id": "tenant-a"},
        limit=10,
        expect_single=True,
    )
    with pytest.raises(DisambiguationRequired):
        pipeline.run(request)


def test_disambiguation_with_unique_key(sqlite_db):
    pipeline = StructuredRetrievalPipeline(config=_config(), connection=sqlite_db)
    request = StructuredQueryRequest(
        table="customers",
        select=["id", "name", "email"],
        filters={"id": 1, "tenant_id": "tenant-a"},
        limit=10,
        expect_single=True,
    )
    result, plan, _ = pipeline.run(request)
    assert plan.table == "customers"
    assert result.row_count == 1
    assert result.rows[0]["id"] == 1
