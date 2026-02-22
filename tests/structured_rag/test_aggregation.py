from summit.retrieval.structured import (
    AllowlistConfig,
    BudgetConfig,
    StructuredRagConfig,
    StructuredQueryRequest,
    StructuredRetrievalPipeline,
    TenantConfig,
)


def _config() -> StructuredRagConfig:
    return StructuredRagConfig(
        allowlist=AllowlistConfig(
            tables={
                "orders": ["id", "customer_id", "amount", "date", "tenant_id"],
            }
        ),
        budgets=BudgetConfig(max_rows=200, max_bytes=262144),
        tenant=TenantConfig(column="tenant_id", value="tenant-a"),
    )


def test_aggregation_sum(sqlite_db):
    pipeline = StructuredRetrievalPipeline(config=_config(), connection=sqlite_db)
    request = StructuredQueryRequest(
        table="orders",
        select=["customer_id"],
        filters={
            "customer_id": 1,
            "tenant_id": "tenant-a",
            "date": (">=", "2026-01-01"),
        },
        aggregations={"total_spend": ("sum", "amount")},
        group_by=["customer_id"],
        limit=10,
    )
    result, _, _ = pipeline.run(request)
    assert result.row_count == 1
    assert result.rows[0]["customer_id"] == 1
    assert result.rows[0]["total_spend"] == 150.0
