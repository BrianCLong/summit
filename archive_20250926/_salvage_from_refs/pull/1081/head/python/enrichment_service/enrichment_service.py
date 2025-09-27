import asyncio
import logging
import os

from dotenv import load_dotenv
from fuzzywuzzy import fuzz
from neo4j import GraphDatabase

load_dotenv()  # Load environment variables from .env file

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")


class Neo4jGraph:
    def __init__(self, uri, user, password):
        self.uri = uri
        self.user = user
        self.password = password
        self.driver = None

    def connect(self):
        try:
            self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))
            self.driver.verify_connectivity()
            logging.info("Successfully connected to Neo4j.")
        except Exception as e:
            logging.error(f"Failed to connect to Neo4j: {e}")
            self.driver = None

    def close(self):
        if self.driver:
            self.driver.close()
            logging.info("Neo4j connection closed.")

    def fetch_entities(self, label="Person", name_property="name"):
        """
        Fetches entities (nodes) from Neo4j with a given label and name property.
        """
        if not self.driver:
            logging.error("Not connected to Neo4j.")
            return []
        query = f"MATCH (n:{label}) RETURN n.{name_property} AS name, ID(n) AS id"
        with self.driver.session() as session:
            result = session.run(query)
            return [{"name": record["name"], "id": record["id"]} for record in result]

    def enrich_entity_with_news(self, entity_id, article_title, article_url, sentiment_score=None):
        """
        Attaches news article metadata to an existing entity node.
        """
        if not self.driver:
            logging.error("Not connected to Neo4j.")
            return
        query = (
            f"MATCH (n) WHERE ID(n) = {entity_id} "
            "SET n.last_enriched_timestamp = datetime() "
            "MERGE (n)-[r:HAS_NEWS_ARTICLE]->(a:NewsArticle {url: $article_url}) "
            "ON CREATE SET a.title = $article_title, a.published_date = datetime(), a.sentiment_score = $sentiment_score "
            "RETURN n, r, a"
        )
        with self.driver.session() as session:
            session.run(
                query,
                article_title=article_title,
                article_url=article_url,
                sentiment_score=sentiment_score,
            )
            logging.info(f"Enriched entity {entity_id} with news article: {article_title}")


class EnrichmentService:
    def __init__(self, neo4j_graph):
        self.neo4j_graph = neo4j_graph

    def find_matching_entity(self, external_name, entities, threshold=80):
        """
        Finds the best matching entity from a list based on fuzzy matching.
        """
        best_match = None
        highest_score = 0
        for entity in entities:
            score = fuzz.ratio(external_name.lower(), entity["name"].lower())
            if score > highest_score and score >= threshold:
                highest_score = score
                best_match = entity
        return best_match

    async def enrich_with_gdelt_articles(self, gdelt_articles):
        logging.info("Starting enrichment with GDELT articles...")
        # Fetch entities from Neo4j (e.g., Persons or Organizations)
        # For demonstration, let's assume we are enriching 'Person' nodes
        graph_persons = self.neo4j_graph.fetch_entities(label="Person", name_property="name")
        logging.info(f"Fetched {len(graph_persons)} Person entities from Neo4j.")

        for article in gdelt_articles:
            article_title = article.get("title", "N/A")
            article_url = article.get("url", "N/A")
            # Simple sentiment placeholder: could be integrated with an NLP service later
            sentiment_score = 0.5  # Neutral for now

            # Attempt to find a matching entity in the graph based on article title or extracted entities
            # For simplicity, let's try to match based on keywords in the title for now
            # In a real scenario, you'd extract entities from the article content first.
            matched_entity = None
            for person in graph_persons:
                if fuzz.partial_ratio(person["name"].lower(), article_title.lower()) > 75:
                    matched_entity = person
                    break

            if matched_entity:
                logging.info(
                    f"Found potential match for article '{article_title}' with entity '{matched_entity['name']}'"
                )
                self.neo4j_graph.enrich_entity_with_news(
                    matched_entity["id"], article_title, article_url, sentiment_score
                )
            else:
                logging.info(f"No strong match found for article: {article_title}")


# Example Usage (for testing purposes)
async def main():
    # Ensure you have .env file with NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
    neo4j_uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    neo4j_user = os.getenv("NEO4J_USER", "neo4j")
    neo4j_password = os.getenv("NEO4J_PASSWORD", "password")

    graph_db = Neo4jGraph(neo4j_uri, neo4j_user, neo4j_password)
    graph_db.connect()

    if graph_db.driver:
        enricher = EnrichmentService(graph_db)

        # Dummy GDELT articles for testing
        dummy_articles = [
            {"title": "President Biden visits Ukraine", "url": "http://example.com/biden-ukraine"},
            {"title": "New policy from WHO", "url": "http://example.com/who-policy"},
            {"title": "Conflict in Middle East continues", "url": "http://example.com/middle-east"},
        ]
        await enricher.enrich_with_gdelt_articles(dummy_articles)
    else:
        logging.error("Skipping enrichment due to Neo4j connection failure.")

    graph_db.close()


if __name__ == "__main__":
    asyncio.run(main())
