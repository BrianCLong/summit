import networkx as nx
from app.agents.multilingual_agent import MultilingualIntelAgent


def test_translation_and_entity_extraction():
    agent = MultilingualIntelAgent(
        translator=lambda text: [{"translation_text": "IntelGraph builds AI"}],
        ner=lambda text: [{"word": "IntelGraph"}, {"word": "AI"}],
    )
    result = agent.process_text("тест", source_lang="ru")
    assert result["translation"] == "IntelGraph builds AI"
    assert "IntelGraph" in result["entities"]


def test_graph_insertion():
    agent = MultilingualIntelAgent(
        translator=lambda x: x,
        ner=lambda text: [{"word": "IntelGraph"}],
    )
    g = nx.Graph()
    agent.insert_entities(g, ["IntelGraph", "Threat"])
    assert set(g.nodes) == {"IntelGraph", "Threat"}


def test_fallback_ner(monkeypatch):
    from app.agents import multilingual_agent

    def fail_pipeline(*args, **kwargs):
        raise RuntimeError("no model")

    monkeypatch.setattr(multilingual_agent, "hf_pipeline", fail_pipeline)
    agent = multilingual_agent.MultilingualIntelAgent()
    entities = agent.extract_entities("IntelGraph Builds AI")
    assert "IntelGraph" in entities
