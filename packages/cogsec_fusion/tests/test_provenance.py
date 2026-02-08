import pytest
from cogsec_fusion.provenance.provenance_score import ProvenanceScorer

def test_provenance_score():
    scorer = ProvenanceScorer()

    artifact = {
        "source": "reuters.com",
        "hash": "sha256:1234",
        "retrieved_via": "c2pa"
    }

    score = scorer.calculate_score(artifact)
    assert score == 1.0 # 0.3 + 0.2 + 0.5

def test_provenance_score_partial():
    scorer = ProvenanceScorer()
    artifact = {
        "source": "unknown"
    }
    score = scorer.calculate_score(artifact)
    assert score == 0.3

def test_checklist():
    scorer = ProvenanceScorer()
    checks = scorer.generate_checklist("art-1")
    assert len(checks) > 0
