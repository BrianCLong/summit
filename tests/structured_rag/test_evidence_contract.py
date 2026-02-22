import json

from summit.retrieval.structured import (
    AllowlistConfig,
    BudgetConfig,
    StructuredRagConfig,
    StructuredQueryRequest,
    StructuredRetrievalPipeline,
    TenantConfig,
)


def test_evidence_is_deterministic(sqlite_db, tmp_path):
    config = StructuredRagConfig(
        allowlist=AllowlistConfig(
            tables={"customers": ["id", "name", "email", "tenant_id", "created_date"]}
        ),
        budgets=BudgetConfig(max_rows=200, max_bytes=262144),
        tenant=TenantConfig(column="tenant_id", value="tenant-a"),
        evidence_root=str(tmp_path / "artifacts"),
    )
    pipeline = StructuredRetrievalPipeline(config=config, connection=sqlite_db)
    request = StructuredQueryRequest(
        table="customers",
        select=["id", "name", "email"],
        filters={"id": 3, "tenant_id": "tenant-a"},
        limit=10,
        expect_single=True,
    )

    _, _, run_id_one = pipeline.run(request)
    _, _, run_id_two = pipeline.run(request)

    def read_bundle(run_id: str) -> dict[str, object]:
        root = tmp_path / "artifacts" / run_id
        return {
            "evidence": json.loads((root / "evidence.json").read_text()),
            "plan": json.loads((root / "query_plan.json").read_text()),
            "metrics": json.loads((root / "metrics.json").read_text()),
        }

    bundle_one = read_bundle(run_id_one)
    bundle_two = read_bundle(run_id_two)

    evidence_one = dict(bundle_one["evidence"])
    evidence_two = dict(bundle_two["evidence"])
    evidence_one.pop("run_id", None)
    evidence_two.pop("run_id", None)

    assert evidence_one == evidence_two
    assert bundle_one["plan"] == bundle_two["plan"]
    assert bundle_one["metrics"]["rows"] == 1
    assert bundle_one["metrics"]["bytes"] > 0
