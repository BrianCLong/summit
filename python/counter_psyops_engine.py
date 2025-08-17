
import time
import random
import logging
from collections import deque

# Assume these are installed:
# import nltk
# import spacy
# import networkx as nx
# from transformers import pipeline

# For demonstration, we'll use simplified mocks for NLP and Graph components
# In a real system, these would be replaced by actual library implementations.

class MockNLP:
    def __init__(self):
        # self.sentiment_pipeline = pipeline("sentiment-analysis")
        # self.ner_pipeline = spacy.load("en_core_web_sm")
        pass

    def analyze_sentiment(self, text):
        # Mock BERT-based sentiment analysis
        if "crisis" in text or "fear" in text or "propaganda" in text:
            return {"label": "NEGATIVE", "score": 0.95}
        elif "hope" in text or "positive" in text or "solution" in text:
            return {"label": "POSITIVE", "score": 0.9}
        return {"label": "NEUTRAL", "score": 0.6}

    def extract_entities(self, text):
        # Mock entity recognition
        entities = []
        if "government" in text:
            entities.append({"text": "government", "type": "ORG"})
        if "leader" in text:
            entities.append({"text": "leader", "type": "PERSON"})
        if "economy" in text:
            entities.append({"text": "economy", "type": "CONCEPT"})
        return entities

class MockGraph:
    def __init__(self):
        self.graph = {} # Adjacency list representation for simplicity

    def add_node(self, node_id, attributes=None):
        if node_id not in self.graph:
            self.graph[node_id] = {"neighbors": [], "attributes": attributes if attributes else {}}

    def add_edge(self, u, v, attributes=None):
        if u in self.graph and v in self.graph:
            self.graph[u]["neighbors"].append({"node": v, "attributes": attributes if attributes else {}})
            # For undirected graph, add reverse edge too
            self.graph[v]["neighbors"].append({"node": u, "attributes": attributes if attributes else {}})

    def get_node_attributes(self, node_id):
        return self.graph.get(node_id, {}).get("attributes", {})

    def get_neighbors(self, node_id):
        return [n["node"] for n in self.graph.get(node_id, {}).get("neighbors", [])]

    def model_propagation(self, start_node, depth=2):
        # Simulate narrative propagation using a simple BFS
        visited = set()
        queue = deque([(start_node, 0)])
        propagated_nodes = []

        while queue:
            current_node, current_depth = queue.popleft()
            if current_node not in visited:
                visited.add(current_node)
                propagated_nodes.append(current_node)

                if current_depth < depth:
                    for neighbor in self.get_neighbors(current_node):
                        if neighbor not in visited:
                            queue.append((neighbor, current_depth + 1))
        return propagated_nodes

# --- Re-importing and extending components from test_counter_psyops.py ---
# In a real scenario, you would import these directly if they were in a separate module.
# For this exercise, we'll redefine them with enhancements.

class NarrativeDetector:
    def __init__(self, nlp_model=None, graph_model=None):
        self.nlp = nlp_model if nlp_model else MockNLP()
        self.graph = graph_model if graph_model else MockGraph()
        self.keywords = ["crisis", "fear", "disinformation", "propaganda", "threat"]

    def detect_adversarial_narrative(self, text):
        sentiment = self.nlp.analyze_sentiment(text)
        entities = self.nlp.extract_entities(text)

        is_adversarial = False
        psyops_indicators = []

        # Emotional manipulation detection
        if sentiment["label"] == "NEGATIVE" and sentiment["score"] > 0.8:
            is_adversarial = True
            psyops_indicators.append("Emotional Manipulation (Negative Sentiment)")

        # Keyword matching for adversarial content
        if any(keyword in text.lower() for keyword in self.keywords):
            is_adversarial = True
            psyops_indicators.append("Keyword Match (Adversarial Content)")

        # Simulate misinformation patterns (simplified)
        if "false claim" in text.lower() or "unverified" in text.lower():
            is_adversarial = True
            psyops_indicators.append("Misinformation Pattern")

        # Simulate coordinated amplification (requires graph analysis)
        # For demonstration, let's assume if a text mentions a specific entity
        # that is known to be part of a coordinated network, it's amplified.
        # In a real system, this would involve tracking message spread on the graph.
        if any(entity["text"] == "government" and entity["type"] == "ORG" for entity in entities) and \
           "coordinated" in text.lower(): # Simplified check
            is_adversarial = True
            psyops_indicators.append("Coordinated Amplification (Simulated)")

        return {
            "is_adversarial": is_adversarial,
            "sentiment": sentiment,
            "entities": entities,
            "original_text": text,
            "psyops_indicators": psyops_indicators
        }

class CounterStrategyGenerator:
    def __init__(self, nlp_model=None):
        self.nlp = nlp_model if nlp_model else MockNLP()
        self.synonyms = {
            "crisis": ["challenge", "situation", "period of change"],
            "fear": ["concern", "caution", "prudence"],
            "disinformation": ["misleading information", "inaccurate reports"],
            "propaganda": ["biased messaging", "persuasive communication"]
        }

    def sentiment_flip(self, narrative_analysis):
        original_text = narrative_analysis["original_text"]
        flipped_text = original_text

        if narrative_analysis["sentiment"]["label"] == "NEGATIVE":
            # More sophisticated sentiment flipping using synonyms and rephrasing
            for negative_word, positive_alternatives in self.synonyms.items():
                if negative_word in flipped_text.lower():
                    flipped_text = flipped_text.replace(negative_word, random.choice(positive_alternatives))
            
            # General rephrasing for reassurance
            if "crisis" in original_text.lower():
                flipped_text = flipped_text.replace("crisis", "a manageable situation")
            if "threat" in original_text.lower():
                flipped_text = flipped_text.replace("threat", "a challenge we can overcome")

            # Ensure factual core is preserved (simplified: just keep original text if no flip happens)
            if flipped_text == original_text:
                return f"Regarding '{original_text}', it's important to maintain a balanced perspective."

        return flipped_text

    def inject_credibility(self, text, citations=None, debunking_elements=None):
        if citations is None:
            citations = ["https://www.reputable-source.org/fact-check-123", "https://www.academic-journal.com/study-456"]
        if debunking_elements is None:
            debunking_elements = ["Contrary to some claims, data shows X.", "It's important to distinguish between speculation and verified facts."]

        credibility_boost = ""
        if citations:
            credibility_boost += " (Citations: " + ", ".join(citations) + ")"
        if debunking_elements:
            credibility_boost += " " + " ".join(debunking_elements)

        return f"{text}{credibility_boost}"

    def amplify_source(self, counter_message, alternative_sources=None):
        if alternative_sources is None:
            alternative_sources = ["https://www.trusted-news-outlet.com", "https://www.independent-analysis.org"]
        
        amplification_text = " For more balanced information, consider: " + " ".join(alternative_sources)
        return f"{counter_message}{amplification_text}"

    def obfuscate_message(self, message):
        # Multi-layer obfuscation:
        # 1. Randomized phrasing and synonyms (already handled by sentiment_flip and general phrasing)
        # 2. Proxy sourcing (simulated by adding a generic disclaimer)
        # 3. Temporal delays (simulated by adding a note about future dissemination)
        # 4. Varied dissemination channels (simulated by mentioning different platforms)

        obfuscated_message = message

        # Add random phrasing (if not already done by sentiment_flip)
        if not any(phrase in obfuscated_message for phrase in ["It is important to note that", "Consider this perspective:", "Further analysis suggests:"]):
            phrases = ["It is important to note that", "Consider this perspective:", "Further analysis suggests:"]
            obfuscated_message = f"{random.choice(phrases)} {obfuscated_message}"

        # Simulate proxy sourcing
        obfuscated_message += " (Information compiled from various open sources.)"

        # Simulate temporal delays and varied dissemination channels
        dissemination_notes = [
            " This message will be disseminated across multiple platforms over the coming days.",
            " Expect to see this perspective emerge through diverse channels.",
            " Future communications will reinforce these points."
        ]
        obfuscated_message += random.choice(dissemination_notes)

        return obfuscated_message

# --- Autonomous Counter-PsyOps Engine ---

class CounterPsyOpsEngine:
    def __init__(self, input_source=None, output_sink=None):
        self.nlp = MockNLP()
        self.graph = MockGraph()
        self.narrative_detector = NarrativeDetector(self.nlp, self.graph)
        self.counter_strategy_generator = CounterStrategyGenerator(self.nlp)
        self.input_source = input_source # e.g., a function to fetch data from an API
        self.output_sink = output_sink   # e.g., a function to send generated messages
        self.logger = self._setup_logger()

    def _setup_logger(self):
        logger = logging.getLogger("CounterPsyOpsEngine")
        logger.setLevel(logging.INFO)
        handler = logging.StreamHandler()
        formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        return logger

    def process_input(self, data):
        self.logger.info(f"Processing input: '{data}'")
        # Detection Phase
        narrative_analysis = self.narrative_detector.detect_adversarial_narrative(data)
        self.logger.info(f"Narrative analysis: {narrative_analysis}")

        if narrative_analysis["is_adversarial"]:
            self.logger.warning("Adversarial narrative detected! Initiating counter-operations.")
            # Analysis Phase (further evaluation of psyops indicators)
            self.logger.info(f"PsyOps Indicators: {narrative_analysis['psyops_indicators']}")

            # Counter-Messaging Generation
            counter_message = narrative_analysis["original_text"]

            # 1. Sentiment Flip
            flipped_message = self.counter_strategy_generator.sentiment_flip(narrative_analysis)
            self.logger.info(f"Sentiment Flipped Message: {flipped_message}")
            counter_message = flipped_message

            # 2. Credibility Injection
            credible_message = self.counter_strategy_generator.inject_credibility(counter_message)
            self.logger.info(f"Credibility Injected Message: {credible_message}")
            counter_message = credible_message

            # 3. Source Amplification
            amplified_message = self.counter_strategy_generator.amplify_source(counter_message)
            self.logger.info(f"Source Amplified Message: {amplified_message}")
            counter_message = amplified_message

            # Obfuscation Layers
            final_counter_message = self.counter_strategy_generator.obfuscate_message(counter_message)
            self.logger.info(f"Final Obfuscated Counter-Message: {final_counter_message}")

            if self.output_sink:
                self.output_sink(final_counter_message)
                self.logger.info("Counter-message sent to output sink.")
            return final_counter_message
        else:
            self.logger.info("No adversarial narrative detected. No counter-operations needed.")
            return None

    def run_autonomous_loop(self, interval_seconds=5, max_iterations=5):
        self.logger.info("Starting autonomous counter-psyops engine loop...")
        iteration = 0
        while iteration < max_iterations:
            self.logger.info(f"--- Iteration {iteration + 1} ---")
            if self.input_source:
                data = self.input_source()
                if data:
                    self.process_input(data)
                else:
                    self.logger.info("No new input data available.")
            else:
                self.logger.warning("No input source configured. Cannot fetch data.")
                break # Exit if no input source

            time.sleep(interval_seconds)
            iteration += 1
        self.logger.info("Autonomous counter-psyops engine loop finished.")

# --- Example Usage ---

if __name__ == "__main__":
    # Mock input source: simulates fetching data (e.g., from a social media feed)
    def mock_input_feed():
        sample_narratives = [
            "Urgent: The government is hiding a major crisis, causing widespread fear and panic. This is pure disinformation!",
            "New report shows positive economic growth and opportunities for everyone. Hope is on the horizon.",
            "Beware of unverified claims about the recent event. It's designed to spread propaganda.",
            "Community efforts are bringing positive change and solutions to our challenges.",
            "A coordinated campaign is spreading false claims about our leader, creating unnecessary threat."
        ]
        # Simulate receiving new data over time
        if not hasattr(mock_input_feed, "index"):
            mock_input_feed.index = 0
        
        if mock_input_feed.index < len(sample_narratives):
            data = sample_narratives[mock_input_feed.index]
            mock_input_feed.index += 1
            return data
        return None

    # Mock output sink: simulates deploying counter-messages (e.g., to a communication platform)
    def mock_output_deployer(message):
        print(f"--- DEPLOYING COUNTER-MESSAGE ---\n{message}\n-----------------------------------\n")

    # Initialize and run the engine
    engine = CounterPsyOpsEngine(input_source=mock_input_feed, output_sink=mock_output_deployer)
    engine.run_autonomous_loop(interval_seconds=3, max_iterations=5)
