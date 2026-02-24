from summit.retrieval.structured import (
    AllowlistConfig,
    BudgetConfig,
    PolicyDecision,
    QueryPlan,
    StructuredPolicy,
    StructuredRagConfig,
    TenantConfig,
)


def _policy() -> StructuredPolicy:
    config = StructuredRagConfig(
        allowlist=AllowlistConfig(tables={"orders": ["id", "customer_id", "amount", "date", "tenant_id"]}),
        budgets=BudgetConfig(max_rows=50, max_bytes=262144),
        tenant=TenantConfig(column="tenant_id", value="tenant-a"),
    )
    return StructuredPolicy(config)


def _plan(**overrides) -> QueryPlan:
    base = QueryPlan(
        table="orders",
        select=["id"],
        filters={"tenant_id": "tenant-a"},
        aggregations={},
        group_by=[],
        limit=10,
        order_by=["id"],
        sql="SELECT id FROM orders WHERE tenant_id = ? ORDER BY id LIMIT ?",
        params=["tenant-a", 10],
        expect_single=False,
    )
    return base.__class__(**{**base.__dict__, **overrides})


def test_policy_blocks_non_select():
    policy = _policy()
    plan = _plan(sql="DELETE FROM orders")
    decision = policy.validate(plan)
    assert isinstance(decision, PolicyDecision)
    assert not decision.allowed


def test_requires_tenant_filter():
    policy = _policy()
    plan = _plan(filters={})
    decision = policy.validate(plan)
    assert not decision.allowed
    assert "Tenant filter is required" in decision.reasons


def test_blocks_large_scan():
    policy = _policy()
    plan = _plan(limit=500)
    decision = policy.validate(plan)
    assert not decision.allowed
    assert "Limit exceeds max_rows budget" in decision.reasons
