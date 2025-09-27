import logging
import random
import time

import networkx as nx
import spacy
from transformers import pipeline

# Import IntelGraph client modules
from intelgraph_api_client import IntelGraphAPIClient
from intelgraph_neo4j_client import IntelGraphNeo4jClient
from intelgraph_postgres_client import IntelGraphPostgresClient

# Configure logging for the engine
logger = logging.getLogger(__name__)


# Ensure NLTK data is available (uncomment and run if not already downloaded)
# try:
#     nltk.data.find('tokenizers/punkt')
# except nltk.downloader.DownloadError:
#     nltk.download('punkt')
# try:
#     nltk.data.find('corpora/wordnet')
# except nltk.downloader.DownloadError:
#     nltk.download('wordnet')

# Load spaCy model (download if not already present: python -m spacy download en_core_web_sm)
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("Downloading spaCy model 'en_core_web_sm'...")
    from spacy.cli import download

    download("en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

# Load Hugging Face sentiment analysis pipeline
# Using a smaller, faster model for demonstration
sentiment_pipeline = pipeline(
    "sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english"
)


class NarrativeDetector:
    """
    Simulates the narrative detection component from test_counter_psyops.py.
    Detects adversarial narratives using keyword matching, sentiment analysis,
    and basic graph-based propagation tracking.
    """

    def __init__(self):
        self.adversarial_keywords = [
            "crisis",
            "threat",
            "danger",
            "collapse",
            "fear",
            "propaganda",
            "disinformation",
        ]
        self.narrative_graph = nx.DiGraph()  # To track propagation

    def detect_narrative(self, text: str) -> dict:
        """
        Identifies potential adversarial narratives in the given text.
        """
        detected_keywords = [kw for kw in self.adversarial_keywords if kw in text.lower()]
        is_adversarial = len(detected_keywords) > 0

        # Basic sentiment analysis for initial flagging
        sentiment_result = sentiment_pipeline(text)[0]
        sentiment_label = sentiment_result["label"]
        sentiment_score = sentiment_result["score"]

        # Entity recognition for context
        doc = nlp(text)
        entities = [(ent.text, ent.label_) for ent in doc.ents]

        return {
            "text": text,
            "is_adversarial": is_adversarial,
            "detected_keywords": detected_keywords,
            "sentiment": {"label": sentiment_label, "score": sentiment_score},
            "entities": entities,
            "analysis_timestamp": time.time(),
        }

    def analyze_propagation(self, source_node: str, target_nodes: list[str], narrative_id: str):
        """
        Simulates tracking narrative propagation on a graph.
        Adds edges to a simple directed graph.
        """
        if source_node not in self.narrative_graph:
            self.narrative_graph.add_node(source_node, type="source", narrative=narrative_id)
        for target in target_nodes:
            if target not in self.narrative_graph:
                self.narrative_graph.add_node(target, type="target", narrative=narrative_id)
            self.narrative_graph.add_edge(
                source_node, target, narrative=narrative_id, timestamp=time.time()
            )
        print(
            f"Graph updated: Narrative '{narrative_id}' propagated from '{source_node}' to {target_nodes}"
        )


class SentimentAnalyzer:
    """
    Simulates sentiment analysis and flipping techniques.
    """

    def analyze_sentiment(self, text: str) -> dict:
        """
        Analyzes the sentiment of the given text.
        """
        result = sentiment_pipeline(text)[0]
        return {"label": result["label"], "score": result["score"]}

    def flip_sentiment(self, text: str, target_sentiment: str = "positive") -> str:
        """
        Transforms text to flip its sentiment. This is a highly simplified
        demonstration. In a real system, this would involve more advanced NLG.
        """
        if target_sentiment == "positive":
            if "fear" in text.lower():
                return (
                    text.replace("fear", "hope").replace("crisis", "opportunity")
                    + " We will overcome this."
                )
            if "danger" in text.lower():
                return (
                    text.replace("danger", "safety").replace("threat", "security")
                    + " We are protected."
                )
            if "negative" in sentiment_pipeline(text)[0]["label"].lower():
                return "Despite initial concerns, the situation is improving. " + text
        elif target_sentiment == "negative":
            # Example of flipping to negative (e.g., for analysis or simulation)
            if "hope" in text.lower():
                return text.replace("hope", "despair") + " The situation is dire."
        return text  # Return original if no flip logic applies


class CredibilityInjector:
    """
    Simulates injecting credibility via source verification and fact-checking.
    """

    def inject_credibility(self, message: str, facts: list[str], sources: list[str]) -> str:
        """
        Integrates verified facts and citations into a message.
        """
        injected_message = message
        if facts:
            injected_message += "\n\nVerified facts: " + " ".join([f"- {fact}" for fact in facts])
        if sources:
            injected_message += "\n\nSources: " + ", ".join(sources)
        return injected_message


class SourceAmplifier:
    """
    Simulates promoting reliable alternatives and amplification strategies.
    """

    def amplify_source(
        self, counter_message: str, alternative_sources: list[str], target_channels: list[str]
    ) -> dict:
        """
        Promotes alternative, credible sources or narratives.
        Simulates dissemination.
        """
        amplification_plan = {
            "counter_message": counter_message,
            "alternative_sources": alternative_sources,
            "target_channels": target_channels,
            "simulated_reach": random.randint(1000, 100000),  # Placeholder for reach
            "dissemination_strategy": "simulated_viral_boosting",
        }
        print(
            f"Simulating amplification on channels {target_channels} for message: '{counter_message[:50]}...'"
        )
        return amplification_plan


class Obfuscator:
    """
    Applies multi-layer obfuscation to counter-operations.
    """

    def apply_obfuscation(self, message: str) -> str:
        """
        Applies randomized phrasing, proxy sourcing, and temporal delays.
        Highly simplified for demonstration.
        """
        # 1. Randomized phrasing/synonyms (very basic)
        synonyms = {
            "situation": ["circumstance", "scenario", "state of affairs"],
            "information": ["data", "intel", "details"],
            "report": ["analysis", "briefing", "summary"],
        }
        obfuscated_message = message
        for word, syn_list in synonyms.items():
            if word in obfuscated_message.lower():
                obfuscated_message = obfuscated_message.replace(word, random.choice(syn_list), 1)

        # 2. Proxy sourcing (conceptual)
        proxy_source_tag = f" [via anonymous source {random.randint(100, 999)} ]"
        if random.random() < 0.5:  # 50% chance to add a proxy tag
            obfuscated_message += proxy_source_tag

        # 3. Temporal delays (simulated)
        delay_seconds = random.uniform(0.1, 2.0)
        print(f"Simulating temporal delay of {delay_seconds:.2f} seconds...")
        time.sleep(delay_seconds)

        return obfuscated_message


class PsyOpsCounterEngine:
    """
    The autonomous system for detecting, analyzing, and countering psychological operations.
    """

    def __init__(
        self,
        api_client: IntelGraphAPIClient,
        neo4j_client: IntelGraphNeo4jClient,
        postgres_client: IntelGraphPostgresClient,
    ):
        self.narrative_detector = NarrativeDetector()
        self.sentiment_analyzer = SentimentAnalyzer()
        self.credibility_injector = CredibilityInjector()
        self.source_amplifier = SourceAmplifier()
        self.obfuscator = Obfuscator()

        self.api_client = api_client
        self.neo4j_client = neo4j_client
        self.postgres_client = postgres_client
        logger.info("PsyOpsCounterEngine initialized with IntelGraph clients.")

    def detection_phase(self, input_data: dict, task_id: str) -> dict:
        """
        Automatically scans input data to identify adversarial narratives.
        Integrates with IntelGraph API and Neo4j for persistence.
        """
        logger.info(
            f"--- Detection Phase for message from {input_data.get('source', 'unknown')}: {input_data.get('content', '')[:50]}... (Task: {task_id})"
        )
        self.postgres_client.log_processing_event(
            event_type="DETECTION_START",
            task_id=task_id,
            message=f"Starting detection for message from {input_data.get('source')}",
            metadata=input_data,
        )

        # Perform local narrative detection and sentiment analysis
        narrative_analysis = self.narrative_detector.detect_narrative(input_data["content"])
        narrative_analysis["source_data"] = input_data  # Attach original source data

        logger.info(
            f"Local detection result: Adversarial={narrative_analysis['is_adversarial']}, Sentiment={narrative_analysis['sentiment']['label']}"
        )

        # Submit narrative to IntelGraph API
        try:
            api_narrative_payload = {
                "text": input_data["content"],
                "source": input_data.get("source", "unknown"),
                "region": input_data.get("region", "unknown"),
                "signal_score": input_data.get("signal_score", 0.0),
                "tags": narrative_analysis.get("tags", []) + input_data.get("tags", []),
            }
            api_response = self.api_client.submit_narrative_detection(api_narrative_payload)
            narrative_id = api_response.get("narrative_id")
            narrative_analysis["intelgraph_narrative_id"] = narrative_id
            logger.info(
                f"Narrative submitted to IntelGraph API. ID: {narrative_id}, Status: {api_response.get('status')}"
            )
            self.postgres_client.log_processing_event(
                event_type="NARRATIVE_API_SUBMITTED",
                narrative_id=narrative_id,
                task_id=task_id,
                message="Narrative submitted to IntelGraph API.",
                metadata={"api_response": api_response},
            )
        except Exception as e:
            logger.error(f"Failed to submit narrative to IntelGraph API: {e}", exc_info=True)
            self.postgres_client.log_processing_event(
                event_type="NARRATIVE_API_SUBMIT_FAILED",
                task_id=task_id,
                message=f"Failed to submit narrative to IntelGraph API: {e}",
                metadata={"input_data": input_data, "error": str(e)},
            )
            narrative_id = f"local_narr_{hash(input_data['content'])}"  # Fallback ID
            narrative_analysis["intelgraph_narrative_id"] = narrative_id

        # Store narrative and entities in Neo4j
        try:
            # Create/Update Narrative node
            narrative_node_props = {
                "id": narrative_id,
                "text": input_data["content"],
                "source": input_data.get("source", "unknown"),
                "timestamp": input_data.get("timestamp", time.time()),
                "is_adversarial": narrative_analysis["is_adversarial"],
                "sentiment_label": narrative_analysis["sentiment"]["label"],
                "sentiment_score": narrative_analysis["sentiment"]["score"],
                "confidence": narrative_analysis.get(
                    "confidence", 0.0
                ),  # Assuming confidence from API or local
            }
            self.neo4j_client.create_or_update_entity("Narrative", narrative_node_props)
            self.postgres_client.log_processing_event(
                event_type="NARRATIVE_NEO4J_STORED",
                narrative_id=narrative_id,
                task_id=task_id,
                message="Narrative node stored in Neo4j.",
            )

            # Create/Update Entity nodes and linkages
            entities_to_link = []
            for entity_text, entity_type in narrative_analysis["entities"]:
                entity_props = {"name": entity_text, "type": entity_type}
                # Use a consistent ID for entities, e.g., hash of name+type or a lookup
                entity_id = f"{entity_type.lower()}_{hash(entity_text)}"
                entity_props["id"] = entity_id
                self.neo4j_client.create_or_update_entity(entity_type, entity_props)
                entities_to_link.append({"name": entity_text, "type": entity_type, "id": entity_id})

                # Link narrative to entity
                self.neo4j_client.create_relationship(
                    "Narrative",
                    "id",
                    narrative_id,
                    entity_type,
                    "id",
                    entity_id,
                    "MENTIONS",
                    {"timestamp": time.time()},
                )
                self.postgres_client.log_processing_event(
                    event_type="ENTITY_NEO4J_LINKED",
                    narrative_id=narrative_id,
                    task_id=task_id,
                    message=f"Entity {entity_text} linked to narrative.",
                    metadata={"entity_id": entity_id, "entity_type": entity_type},
                )

            # Submit entity linkages to IntelGraph API if narrative_id is valid
            if narrative_id and not narrative_id.startswith("local_narr_"):
                api_entity_linkage_payload = {
                    "narrative_id": narrative_id,
                    "entities": [
                        {"name": e["name"], "type": e["type"], "confidence": 1.0}
                        for e in entities_to_link
                    ],  # Assuming confidence 1.0 for detected entities
                    "relationships": [],  # Relationships would be more complex, based on deeper analysis
                }
                try:
                    self.api_client.create_entity_linkage(api_entity_linkage_payload)
                    self.postgres_client.log_processing_event(
                        event_type="ENTITY_API_LINKED",
                        narrative_id=narrative_id,
                        task_id=task_id,
                        message="Entities linked via IntelGraph API.",
                    )
                except Exception as e:
                    logger.error(
                        f"Failed to submit entity linkage to IntelGraph API for {narrative_id}: {e}",
                        exc_info=True,
                    )
                    self.postgres_client.log_processing_event(
                        event_type="ENTITY_API_LINK_FAILED",
                        narrative_id=narrative_id,
                        task_id=task_id,
                        message=f"Failed to link entities via IntelGraph API: {e}",
                        metadata={"error": str(e)},
                    )

        except Exception as e:
            logger.error(f"Failed to store narrative/entities in Neo4j: {e}", exc_info=True)
            self.postgres_client.log_processing_event(
                event_type="NEO4J_PERSISTENCE_FAILED",
                narrative_id=narrative_id,
                task_id=task_id,
                message=f"Failed to store narrative/entities in Neo4j: {e}",
                metadata={"error": str(e)},
            )

        return narrative_analysis

    def analysis_phase(self, narrative_analysis: dict, task_id: str) -> dict:
        """
        Evaluates detected narratives for psyops indicators.
        Logs analysis results to PostgreSQL.
        """
        logger.info(f"--- Analysis Phase (Task: {task_id}) ---")
        psyops_indicators = {
            "emotional_manipulation": False,
            "misinformation_patterns": False,
            "coordinated_amplification": False,
        }

        # Simple logic for demonstration
        if (
            narrative_analysis["sentiment"]["label"] == "NEGATIVE"
            and narrative_analysis["is_adversarial"]
        ):
            psyops_indicators["emotional_manipulation"] = True
            logger.info("Identified emotional manipulation due to negative adversarial sentiment.")

        # Further analysis would involve checking against known misinformation databases,
        # analyzing entity relationships, etc.
        logger.info(f"PsyOps Indicators: {psyops_indicators}")

        self.postgres_client.log_processing_event(
            event_type="ANALYSIS_COMPLETE",
            narrative_id=narrative_analysis.get("intelgraph_narrative_id"),
            task_id=task_id,
            message="Narrative analysis complete.",
            metadata={
                "psyops_indicators": psyops_indicators,
                "sentiment": narrative_analysis["sentiment"],
            },
        )
        return {"narrative_analysis": narrative_analysis, "psyops_indicators": psyops_indicators}

    def counter_messaging_generation_phase(self, analysis_result: dict, task_id: str) -> str:
        """
        Generates counter-messages based on the analysis.
        Publishes to IntelGraph API and logs metadata to PostgreSQL.
        """
        logger.info(f"--- Counter-Messaging Generation Phase (Task: {task_id}) ---")
        original_text = analysis_result["narrative_analysis"]["source_data"]["content"]
        narrative_id = analysis_result["narrative_analysis"]["intelgraph_narrative_id"]
        counter_message = original_text

        self.postgres_client.log_processing_event(
            event_type="COUNTER_MESSAGE_GEN_START",
            narrative_id=narrative_id,
            task_id=task_id,
            message="Starting counter-message generation.",
        )

        # Sentiment Flip
        if analysis_result["psyops_indicators"]["emotional_manipulation"]:
            counter_message = self.sentiment_analyzer.flip_sentiment(
                counter_message, target_sentiment="positive"
            )
            logger.info(f"Applied sentiment flip. New message: '{counter_message}'")

        # Credibility Injection
        # In a real system, facts would be retrieved from a knowledge base or IntelGraph's knowledge graph
        facts = [
            "Fact: Independent analysis confirms the data is stable.",
            "Fact: Experts agree on the positive outlook.",
        ]
        sources = ["Reputable News Agency", "Academic Study XYZ"]
        counter_message = self.credibility_injector.inject_credibility(
            counter_message, facts, sources
        )
        logger.info(f"Injected credibility. New message: '{counter_message}'")

        # Source Amplification (pre-obfuscation) - This is now conceptual for the engine, actual dispatch via API
        amplification_plan = self.source_amplifier.amplify_source(
            counter_message,
            alternative_sources=["Official Government Report", "Independent Fact-Checkers"],
            target_channels=[
                "twitter",
                "facebook",
                "telegram",
                "forums",
            ],  # Added forums as a channel
        )
        logger.info(f"Generated conceptual amplification plan: {amplification_plan}")

        # Publish counter-message to IntelGraph API
        try:
            counter_message_payload = {
                "narrative_id": narrative_id,
                "message": counter_message,
                "channels": amplification_plan["target_channels"],
                "intent": "reframe",  # Or 'debunk', 'amplify', etc.
                "language": analysis_result["narrative_analysis"]["source_data"].get(
                    "language", "en"
                ),
            }
            api_response = self.api_client.publish_counter_message(counter_message_payload)
            counter_message_id = api_response.get(
                "counter_message_id", f"cm_{hash(counter_message)}"
            )  # API might return an ID
            logger.info(
                f"Counter-message published to IntelGraph API. ID: {counter_message_id}, Status: {api_response.get('status')}"
            )

            # Save counter-message metadata to PostgreSQL
            self.postgres_client.save_counter_message_metadata(
                counter_message_id=counter_message_id,
                narrative_id=narrative_id,
                status=api_response.get("status", "PUBLISHED"),
                channels_dispatched=amplification_plan["target_channels"],
                response_metrics={},
            )
            self.postgres_client.log_processing_event(
                event_type="COUNTER_MESSAGE_API_PUBLISHED",
                narrative_id=narrative_id,
                task_id=task_id,
                message="Counter-message published via IntelGraph API.",
                metadata={"counter_message_id": counter_message_id, "api_response": api_response},
            )
        except Exception as e:
            logger.error(f"Failed to publish counter-message to IntelGraph API: {e}", exc_info=True)
            self.postgres_client.log_processing_event(
                event_type="COUNTER_MESSAGE_API_PUBLISH_FAILED",
                narrative_id=narrative_id,
                task_id=task_id,
                message=f"Failed to publish counter-message to IntelGraph API: {e}",
                metadata={"error": str(e)},
            )

        return counter_message

    def obfuscation_layers_phase(
        self, counter_message: str, narrative_id: str = None, task_id: str = None
    ) -> str:
        """
        Applies multi-layer obfuscation to counter-operations.
        Logs obfuscation event to PostgreSQL.
        """
        logger.info(f"--- Obfuscation Layers Phase (Task: {task_id}) ---")
        obfuscated_message = self.obfuscator.apply_obfuscation(counter_message)
        logger.info(f"Applied obfuscation. Final message: '{obfuscated_message}'")

        self.postgres_client.log_processing_event(
            event_type="OBFUSCATION_COMPLETE",
            narrative_id=narrative_id,
            task_id=task_id,
            message="Counter-message obfuscated.",
            metadata={
                "original_length": len(counter_message),
                "obfuscated_length": len(obfuscated_message),
            },
        )
        return obfuscated_message
