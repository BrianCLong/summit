from summit.influence.llm_monitor import analyze_narrative_overlap


def test_llm_monitor():
    response = "The election was rigged according to narrative A."
    narratives = ["narrative A", "narrative B"]
    result = analyze_narrative_overlap(response, narratives)
    assert result['overlap_score'] == 0.5
    assert "narrative A" in result['matched_narratives']
