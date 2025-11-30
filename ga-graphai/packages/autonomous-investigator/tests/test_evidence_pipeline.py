import pathlib
import sys

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from autonomous_investigator.analysis import EvidenceAnalysisPipeline, EvidenceArtifact


def test_pipeline_builds_relationships_and_tags():
    pipeline = EvidenceAnalysisPipeline(anomaly_sigma=1.0)
    artifacts = [
        EvidenceArtifact(
            id="artifact-high",
            category="network",
            risk_score=0.95,
            signals=["beacon", "cnc", "malware"],
            attributes={"bytes": 120000, "duration": 5.2},
        ),
        EvidenceArtifact(
            id="artifact-linked",
            category="endpoint",
            risk_score=0.7,
            signals=["beacon", "persistence", "credential"],
            attributes={"bytes": 40000, "duration": 1.8},
        ),
        EvidenceArtifact(
            id="artifact-benign",
            category="document",
            risk_score=0.2,
            signals=["document", "metadata"],
            attributes={"bytes": 1200, "duration": 0.4},
        ),
    ]

    report = pipeline.analyze(artifacts)

    assert report.anomalies[0].id == "artifact-high"
    assert report.pattern_signatures["network"] == ["beacon", "cnc", "malware"]

    relationship_pairs = {(rel.source, rel.target) for rel in report.relationships}
    assert ("artifact-high", "artifact-linked") in relationship_pairs
    assert report.classifications["artifact-high"] == "priority-threat-surface"
    assert "critical" in report.tags["artifact-high"]
    assert "linked-evidence" in report.tags["artifact-linked"]
    assert "contextual-artifact" in report.tags["artifact-benign"]


def test_attribute_outlier_counts_as_anomaly():
    pipeline = EvidenceAnalysisPipeline(anomaly_sigma=1.0)
    artifacts = [
        EvidenceArtifact(
            id="baseline-one",
            category="network",
            risk_score=0.4,
            signals=["dns", "http"],
            attributes={"bytes": 1500, "duration": 0.8},
        ),
        EvidenceArtifact(
            id="baseline-two",
            category="network",
            risk_score=0.42,
            signals=["dns", "tls"],
            attributes={"bytes": 1600, "duration": 0.9},
        ),
        EvidenceArtifact(
            id="attribute-outlier",
            category="network",
            risk_score=0.39,
            signals=["dns", "http"],
            attributes={"bytes": 90000, "duration": 1.0},
        ),
    ]

    report = pipeline.analyze(artifacts)

    assert any(artifact.id == "attribute-outlier" for artifact in report.anomalies)
