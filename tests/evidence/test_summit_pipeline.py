import json
import pathlib
import sys
import pytest

# Add the source directory to sys.path
REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
AI_SRC = REPO_ROOT / "ga-graphai/packages/autonomous-investigator/src"
sys.path.append(str(AI_SRC))

from autonomous_investigator.analysis import EvidenceAnalysisPipeline, EvidenceArtifact
from autonomous_investigator.fusion_pipeline import IntelligenceFusionPipeline, FusionEntity

FIXTURE_PATH = REPO_ROOT / "tests/fixtures/evidence/pipeline_test_artifacts.json"

@pytest.fixture
def pipeline_data():
    with open(FIXTURE_PATH, "r") as f:
        return json.load(f)

class TestEvidenceAnalysisPipeline:
    def test_detect_anomalies_risk_outlier(self, pipeline_data):
        pipeline = EvidenceAnalysisPipeline(anomaly_sigma=1.0)
        artifacts = [EvidenceArtifact(**a) for a in pipeline_data["evidence_artifacts"]]

        # artifact-001 has risk_score 0.95, others are 0.3 and 0.5.
        # Mean is (0.95+0.3+0.5)/3 = 0.583. Stdev is approx 0.27.
        # (0.95 - 0.583) / 0.27 = 1.35 > 1.0
        anomalies = pipeline._detect_anomalies(artifacts)

        assert any(a.id == "artifact-001" for a in anomalies)
        assert anomalies[0].id == "artifact-001" # Sorted by risk_score desc

    def test_detect_anomalies_attribute_outlier(self, pipeline_data):
        pipeline = EvidenceAnalysisPipeline(anomaly_sigma=1.0)
        # Create a specific outlier for attributes
        artifacts = [
            EvidenceArtifact(id="b1", category="net", risk_score=0.5, signals=[], attributes={"bytes": 100}),
            EvidenceArtifact(id="b2", category="net", risk_score=0.5, signals=[], attributes={"bytes": 110}),
            EvidenceArtifact(id="outlier", category="net", risk_score=0.5, signals=[], attributes={"bytes": 1000})
        ]

        anomalies = pipeline._detect_anomalies(artifacts)
        assert any(a.id == "outlier" for a in anomalies)

    def test_infer_relationships_linking(self, pipeline_data):
        pipeline = EvidenceAnalysisPipeline()
        artifacts = [EvidenceArtifact(**a) for a in pipeline_data["evidence_artifacts"]]

        # artifact-001 and artifact-003 both have "beacon" signal
        relationships = pipeline._infer_relationships(artifacts)

        rel_ids = {(r.source, r.target) for r in relationships}
        assert ("artifact-001", "artifact-003") in rel_ids
        assert ("artifact-003", "artifact-001") in rel_ids

        # Check rationale
        rel = next(r for r in relationships if r.source == "artifact-001" and r.target == "artifact-003")
        assert "Shared signals ['beacon']" in rel.rationale

    def test_tag_evidence_automated_tagging(self, pipeline_data):
        pipeline = EvidenceAnalysisPipeline()
        artifacts = [EvidenceArtifact(**a) for a in pipeline_data["evidence_artifacts"]]

        report = pipeline.analyze(artifacts)

        # artifact-001: risk 0.95 (>=0.8) -> priority-threat-surface, critical, linked-evidence (via beacon)
        tags_001 = report.tags["artifact-001"]
        assert "priority-threat-surface" in tags_001
        assert "critical" in tags_001
        assert "linked-evidence" in tags_001
        assert "anomaly" in tags_001 # 0.95 is an anomaly in this set

        # artifact-002: risk 0.3, category endpoint -> infrastructure-trace, linked-evidence (none shared) -> wait
        # Let's check _classify_artifacts logic for artifact-002
        # risk < 0.8, category endpoint -> infrastructure-trace
        assert report.classifications["artifact-002"] == "infrastructure-trace"
        assert "infrastructure-trace" in report.tags["artifact-002"]

class TestIntelligenceFusionPipeline:
    def test_enrich_entities_confidence_update(self, pipeline_data):
        def mock_enrichment(entity):
            if entity.id == "ent-osint-001":
                return {"confidence_delta": 0.1, "verified": True}
            return {}

        pipeline = IntelligenceFusionPipeline(
            enrichment_providers={"osint": mock_enrichment}
        )
        entities = [FusionEntity(**e) for e in pipeline_data["fusion_entities"]]
        pipeline.ingest_many(entities)

        enriched = pipeline._enrich_entities()

        ent_001 = next(e for e in enriched if e.id == "ent-osint-001")
        # Initial confidence 0.7 + 0.1 = 0.8
        assert ent_001.confidence == pytest.approx(0.8)
        assert ent_001.attributes["verified"] is True

    def test_correlate_entities_cross_domain(self, pipeline_data):
        pipeline = IntelligenceFusionPipeline()
        entities = [FusionEntity(**e) for e in pipeline_data["fusion_entities"]]

        # ent-osint-001 and ent-finintel-001 share email "shadow@example.com"
        # ent-osint-001 and ent-cyber-001 share alias "shadow_walker"
        correlations = pipeline._correlate_entities(entities)

        # Verify cross-domain links
        links = {(c.source, c.target) for c in correlations}
        assert ("ent-osint-001", "ent-finintel-001") in links
        assert ("ent-osint-001", "ent-cyber-001") in links

        # Check rationale for shared attribute
        corr = next(c for c in correlations if c.source == "ent-osint-001" and c.target == "ent-finintel-001")
        assert "via email" in corr.rationale

    def test_detect_patterns_chain_traversal(self, pipeline_data):
        pipeline = IntelligenceFusionPipeline()
        entities = [FusionEntity(**e) for e in pipeline_data["fusion_entities"]]
        pipeline.ingest_many(entities)

        enriched = pipeline._enrich_entities()
        correlations = pipeline._correlate_entities(enriched)

        # OSINT -> FinIntel (email)
        # OSINT -> Cyber (alias)
        # This forms a component containing all three domains: osint, finintel, cyber.
        patterns = pipeline._detect_patterns(enriched, correlations)

        assert len(patterns) > 0
        pattern = patterns[0]
        assert "osint" in {pipeline.entities[node].domain for node in pattern.chain}
        assert "finintel" in {pipeline.entities[node].domain for node in pattern.chain}
        assert "cyber" in {pipeline.entities[node].domain for node in pattern.chain}
        assert pattern.confidence > 0
