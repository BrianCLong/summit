from summit.influence.provenance_analyzer import ProvenanceAnalyzer


def test_provenance_analyzer():
    analyzer = ProvenanceAnalyzer()
    res = analyzer.analyze_media({})
    assert res["is_synthetic"] is True
