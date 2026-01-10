import json
import pathlib
import sys
from collections.abc import Callable

import pytest

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from autonomous_investigator.case_report import (  # type: ignore
    build_cypher_preview,
    build_graphrag_summary,
    build_hypotheses,
    build_results_table,
    load_case_manifest,
)
from autonomous_investigator.fusion_pipeline import (  # type: ignore
    FusionEntity,
    IntelligenceFusionPipeline,
)


@pytest.fixture
def enrichment_providers() -> dict[str, Callable[[FusionEntity], dict]]:
    """Mock enrichment hooks representing external OSINT/FinIntel/Cyber APIs."""

    def osint_provider(entity: FusionEntity) -> dict:
        return {
            "aliases": [f"alias-{entity.id}"],
            "confidence_delta": 0.2,
            "email": entity.attributes.get("email"),
        }

    def finintel_provider(entity: FusionEntity) -> dict:
        return {
            "sanctions": ["ofac-watch"],
            "confidence_delta": 0.1,
            "wallet": entity.attributes.get("wallet"),
        }

    def cyber_provider(entity: FusionEntity) -> dict:
        return {
            "ioc": True,
            "infrastructure": entity.attributes.get("infrastructure", []),
            "confidence_delta": 0.05,
        }

    return {
        "osint": osint_provider,
        "finintel": finintel_provider,
        "cyber": cyber_provider,
    }


@pytest.fixture
def fusion_entities() -> list[FusionEntity]:
    """OSINT-driven entities stitched across domains for an investigation."""

    return [
        FusionEntity(
            id="osint-target",
            domain="osint",
            entity_type="person",
            attributes={"email": "target@example.com", "handle": "ghosthawk"},
            confidence=0.65,
            sources=["open-web"],
        ),
        FusionEntity(
            id="finintel-leak",
            domain="finintel",
            entity_type="wallet",
            attributes={"wallet": "0xabc123", "email": "target@example.com"},
            confidence=0.7,
            sources=["transaction-monitor"],
        ),
        FusionEntity(
            id="cyber-ioc",
            domain="cyber",
            entity_type="infrastructure",
            attributes={"infrastructure": ["edge-gateway"], "email": "target@example.com"},
            confidence=0.6,
            sources=["sensor-net"],
        ),
    ]


def test_osint_workflow_entity_search_and_enrichment(
    enrichment_providers: dict[str, Callable[[FusionEntity], dict]],
    fusion_entities: list[FusionEntity],
) -> None:
    pipeline = IntelligenceFusionPipeline(
        enrichment_providers=enrichment_providers,
        min_correlation_score=0.2,
    )
    pipeline.ingest_many(fusion_entities)

    outcome = pipeline.run_pipeline()

    assert len(outcome.enriched_entities) == len(fusion_entities)
    assert all(entity.attributes.get("aliases") for entity in outcome.enriched_entities)

    assert outcome.correlations, "Expected cross-domain correlations for shared indicators"
    top_correlation = outcome.correlations[0]
    assert "email" in top_correlation.shared_attributes
    assert "Correlated" in top_correlation.rationale

    assert outcome.patterns, "Should detect a multi-domain investigation pattern"
    chain_domains = {pipeline.entities[node].domain for node in outcome.patterns[0].chain}
    assert chain_domains == {"osint", "finintel", "cyber"}


@pytest.fixture
def manifest_path(tmp_path: pathlib.Path) -> pathlib.Path:
    manifest = {
        "caseId": "inv-osint-7",
        "root": "root-hash-abc",
        "steps": [
            {"op": "collect_osint", "model": "scraper:v1", "configChecksum": "aaa111"},
            {"op": "analyze_entities", "model": "fusion:v2", "configChecksum": "bbb222"},
            {"op": "export_report", "model": "reporter:v3", "configChecksum": "ccc333"},
        ],
    }
    path = tmp_path / "manifest.json"
    path.write_text(json.dumps(manifest))
    return path


def test_osint_report_generation_and_export(manifest_path: pathlib.Path) -> None:
    manifest = load_case_manifest(manifest_path)

    hypotheses = build_hypotheses(manifest)
    results_table = build_results_table(manifest)
    cypher_preview = build_cypher_preview(manifest)
    summary = build_graphrag_summary(manifest)

    assert manifest.step_count == 3
    assert hypotheses and all(hypothesis["claim"] for hypothesis in hypotheses)

    assert results_table[0]["operation"] == "collect_osint"
    assert results_table[-1]["model"] == "reporter:v3"

    assert cypher_preview[0]["query"].startswith("MERGE (c:Case")
    assert cypher_preview[1]["estimated_rows"] == manifest.step_count

    assert str(manifest.case_id) in summary
    assert "integrity" in summary.lower()
