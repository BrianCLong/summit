import pathlib
import sys

import pytest

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "src"))
from autonomous_investigator.fusion_pipeline import (  # type: ignore  # noqa: E402
    FusionEntity,
    IntelligenceFusionPipeline,
)


@pytest.fixture()
def pipeline():
    def osint_enricher(entity: FusionEntity) -> dict[str, float]:
        return {"confidence_delta": 0.1, "alias": entity.attributes.get("alias", [])}

    def finintel_enricher(entity: FusionEntity) -> dict[str, float]:
        return {"confidence_delta": 0.05, "wallet": entity.attributes.get("wallet")}

    def cyber_enricher(entity: FusionEntity) -> dict[str, float]:
        return {"confidence_delta": 0.08, "ip": entity.attributes.get("ip")}

    return IntelligenceFusionPipeline(
        enrichment_providers={
            "osint": osint_enricher,
            "finintel": finintel_enricher,
            "cyber": cyber_enricher,
        }
    )


def test_pipeline_builds_cross_domain_pattern(pipeline: IntelligenceFusionPipeline):
    pipeline.ingest_many(
        [
            FusionEntity(
                id="osint-1",
                domain="osint",
                entity_type="campaign",
                attributes={"alias": "shadow fox", "ip": "10.0.0.5"},
                confidence=0.62,
            ),
            FusionEntity(
                id="fin-1",
                domain="finintel",
                entity_type="wallet",
                attributes={"wallet": "0xfeed", "alias": "Shadow Fox"},
                confidence=0.55,
            ),
            FusionEntity(
                id="cyber-1",
                domain="cyber",
                entity_type="infrastructure",
                attributes={"ip": "10.0.0.5", "hash": "abcd1234"},
                confidence=0.68,
            ),
        ]
    )

    outcome = pipeline.run_pipeline()

    assert outcome.correlations, "expected cross-domain correlations to be produced"
    assert any("alias" in corr.shared_attributes for corr in outcome.correlations)
    assert any("ip" in corr.shared_attributes for corr in outcome.correlations)

    chain_domains = {pipeline.entities[node].domain for node in outcome.patterns[0].chain}
    assert {"osint", "finintel", "cyber"}.issubset(chain_domains)
    assert outcome.patterns[0].confidence >= 0.45


def test_correlation_respects_thresholds(pipeline: IntelligenceFusionPipeline):
    low_overlap_osint = FusionEntity(
        id="osint-weak",
        domain="osint",
        entity_type="report",
        attributes={"alias": "unrelated"},
        confidence=0.4,
    )
    finintel_entity = FusionEntity(
        id="fin-solo",
        domain="finintel",
        entity_type="wallet",
        attributes={"wallet": "0xbeef"},
        confidence=0.6,
    )

    pipeline.ingest_many([low_overlap_osint, finintel_entity])
    outcome = pipeline.run_pipeline()
    assert not outcome.correlations
    assert not outcome.patterns


def test_pattern_chain_orders_by_domain_priority(pipeline: IntelligenceFusionPipeline):
    osint_entity = FusionEntity(
        id="osint-2",
        domain="osint",
        entity_type="campaign",
        attributes={"infrastructure": {"primary": "cdn.example.com"}},
        confidence=0.58,
    )
    finintel_entity = FusionEntity(
        id="fin-2",
        domain="finintel",
        entity_type="wallet",
        attributes={"infrastructure": "cdn.example.com"},
        confidence=0.6,
    )
    cyber_entity = FusionEntity(
        id="cyber-2",
        domain="cyber",
        entity_type="infrastructure",
        attributes={"infrastructure": ["cdn.example.com"]},
        confidence=0.64,
    )

    pipeline.ingest_many([osint_entity, finintel_entity, cyber_entity])

    outcome = pipeline.run_pipeline()

    assert outcome.patterns, "expected a pattern linking all three domains"
    assert any("infrastructure" in corr.shared_attributes for corr in outcome.correlations)

    chain = outcome.patterns[0].chain
    chain_domains = [pipeline.entities[node].domain for node in chain]
    assert chain_domains == ["osint", "finintel", "cyber"]
