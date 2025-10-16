import unittest

# Placeholder for NLP and Graph libraries
# In a real scenario, these would be actual imports like:
# import nltk
# import spacy
# import networkx
# from transformers import pipeline


class MockNLP:
    """Mock NLP capabilities for testing."""

    def analyze_sentiment(self, text):
        if "crisis" in text or "fear" in text:
            return {"label": "NEGATIVE", "score": 0.9}
        elif "hope" in text or "positive" in text:
            return {"label": "POSITIVE", "score": 0.8}
        return {"label": "NEUTRAL", "score": 0.5}

    def extract_entities(self, text):
        if "government" in text:
            return [{"text": "government", "type": "ORG"}]
        return []


class MockGraph:
    """Mock Graph capabilities for testing narrative propagation."""

    def __init__(self):
        self.nodes = {}
        self.edges = []

    def add_node(self, node_id, attributes=None):
        self.nodes[node_id] = attributes if attributes else {}

    def add_edge(self, u, v, attributes=None):
        self.edges.append((u, v, attributes if attributes else {}))

    def get_neighbors(self, node_id):
        return [v for u, v, _ in self.edges if u == node_id]

    def get_node_attributes(self, node_id):
        return self.nodes.get(node_id, {})


# --- Core Components (as described in the prompt) ---


class NarrativeDetector:
    def __init__(self, nlp_model=None, graph_model=None):
        self.nlp = nlp_model if nlp_model else MockNLP()
        self.graph = graph_model if graph_model else MockGraph()

    def detect_adversarial_narrative(self, text):
        sentiment = self.nlp.analyze_sentiment(text)
        entities = self.nlp.extract_entities(text)

        is_adversarial = False
        if sentiment["label"] == "NEGATIVE" and sentiment["score"] > 0.7:
            is_adversarial = True
        # Simulate graph-based propagation tracking (simplified)
        if "disinformation" in text or "propaganda" in text:
            is_adversarial = True

        return {
            "is_adversarial": is_adversarial,
            "sentiment": sentiment,
            "entities": entities,
            "original_text": text,
        }


class CounterStrategyGenerator:
    def __init__(self, nlp_model=None):
        self.nlp = nlp_model if nlp_model else MockNLP()

    def sentiment_flip(self, narrative_analysis):
        original_text = narrative_analysis["original_text"]
        if narrative_analysis["sentiment"]["label"] == "NEGATIVE":
            # Simple replacement for demonstration
            flipped_text = original_text.replace("crisis", "opportunity").replace("fear", "hope")
            return flipped_text
        return original_text

    def inject_credibility(
        self, text, source="reputable_source.org", fact="Fact: Data supports this."
    ):
        return f"{text} (Source: {source}, Fact-check: {fact})"

    def amplify_source(self, counter_message, alternative_source="trusted_news.com"):
        return f"{counter_message} Read more at {alternative_source}"

    def obfuscate_message(self, message):
        # Simple obfuscation: add random phrasing
        import random

        phrases = [
            "It is important to note that",
            "Consider this perspective:",
            "Further analysis suggests:",
        ]
        return f"{random.choice(phrases)} {message}"


# --- Unit Tests ---


class TestCounterPsyOps(unittest.TestCase):

    def setUp(self):
        self.nlp_mock = MockNLP()
        self.graph_mock = MockGraph()
        self.narrative_detector = NarrativeDetector(self.nlp_mock, self.graph_mock)
        self.counter_strategy_generator = CounterStrategyGenerator(self.nlp_mock)

    def test_narrative_detection_adversarial(self):
        text = "This is a crisis, full of fear and disinformation."
        result = self.narrative_detector.detect_adversarial_narrative(text)
        self.assertTrue(result["is_adversarial"])
        self.assertEqual(result["sentiment"]["label"], "NEGATIVE")

    def test_narrative_detection_non_adversarial(self):
        text = "This is a positive development with much hope."
        result = self.narrative_detector.detect_adversarial_narrative(text)
        self.assertFalse(result["is_adversarial"])
        self.assertEqual(result["sentiment"]["label"], "POSITIVE")

    def test_sentiment_flip(self):
        narrative_analysis = {
            "is_adversarial": True,
            "sentiment": {"label": "NEGATIVE", "score": 0.9},
            "entities": [],
            "original_text": "The crisis will bring fear.",
        }
        flipped_text = self.counter_strategy_generator.sentiment_flip(narrative_analysis)
        self.assertIn("opportunity", flipped_text)
        self.assertIn("hope", flipped_text)
        self.assertNotIn("crisis", flipped_text)
        self.assertNotIn("fear", flipped_text)

    def test_inject_credibility(self):
        message = "This is a statement."
        credible_message = self.counter_strategy_generator.inject_credibility(message)
        self.assertIn(
            "(Source: reputable_source.org, Fact-check: Fact: Data supports this.)",
            credible_message,
        )

    def test_amplify_source(self):
        message = "Counter message."
        amplified_message = self.counter_strategy_generator.amplify_source(message)
        self.assertIn("Read more at trusted_news.com", amplified_message)

    def test_obfuscate_message(self):
        message = "Secret counter operation."
        obfuscated_message = self.counter_strategy_generator.obfuscate_message(message)
        self.assertNotEqual(message, obfuscated_message)
        self.assertTrue(
            obfuscated_message.startswith("It is important to note that")
            or obfuscated_message.startswith("Consider this perspective:")
            or obfuscated_message.startswith("Further analysis suggests:")
        )


if __name__ == "__main__":
    unittest.main()
