from summit.integrations.palantir_gotham_akashic import SemanticTimeTravel, NarrativeWeaver, ProphecyEngine

def test_semantic_time_travel():
    stt = SemanticTimeTravel()
    stt.record("e1", "2024-01", "A rising star")
    stt.record("e1", "2025-01", "A fallen hero")

    meaning = stt.query_meaning("e1", ("2024-01", "2024-02"))
    assert "rising star" in meaning

def test_narrative_weaver():
    nw = NarrativeWeaver()
    story = nw.weave_story(["Alice", "Bob"])
    assert "Alice and Bob were connected" in story

def test_prophecy():
    pe = ProphecyEngine()
    pred = pe.predict_next_link("Alice")
    assert "Alice will link to" in pred
