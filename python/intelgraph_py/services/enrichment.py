from typing import Any

from fuzzywuzzy import fuzz

from intelgraph_py.logger_config import logger
from intelgraph_py.storage.neo4j_store import Neo4jStore


class EnrichmentService:
    def __init__(self, store: Neo4jStore):
        self.store = store

    def find_matching_entity(self, external_name: str, entities: list[dict], threshold: int = 80) -> Any:
        """
        Finds the best matching entity from a list based on fuzzy matching.
        """
        best_match = None
        highest_score = 0
        for entity in entities:
            # Check if name exists
            if "name" not in entity:
                continue
            score = fuzz.ratio(external_name.lower(), entity["name"].lower())
            if score > highest_score and score >= threshold:
                highest_score = score
                best_match = entity
        return best_match

    async def enrich_with_gdelt_articles(self, gdelt_articles: list[dict]):
        logger.info("Starting enrichment with GDELT articles...")

        # Fetch entities from Neo4j (e.g., Persons or Organizations)
        # Using Neo4jStore.query. Assuming Person label exists.
        query = "MATCH (n:Person) RETURN n.name AS name, ID(n) AS id"

        try:
            result = self.store.query(query)
            graph_persons = result if result else []
        except Exception as e:
            logger.error(f"Failed to fetch entities from Neo4j: {e}")
            return

        logger.info(f"Fetched {len(graph_persons)} Person entities from Neo4j.")

        for article in gdelt_articles:
            article_title = article.get("title", "N/A")
            article_url = article.get("url", "N/A")
            sentiment_score = 0.5  # Neutral for now

            matched_entity = None
            for person in graph_persons:
                if "name" in person and fuzz.partial_ratio(person["name"].lower(), article_title.lower()) > 75:
                    matched_entity = person
                    break

            if matched_entity:
                logger.info(
                    f"Found potential match for article '{article_title}' with entity '{matched_entity['name']}'"
                )
                self._enrich_entity_with_news(
                    matched_entity["id"], article_title, article_url, sentiment_score
                )
            else:
                logger.info(f"No strong match found for article: {article_title}")

    def _enrich_entity_with_news(self, entity_id, article_title, article_url, sentiment_score=None):
        query = (
            "MATCH (n) WHERE ID(n) = $entity_id "
            "SET n.last_enriched_timestamp = datetime() "
            "MERGE (n)-[r:HAS_NEWS_ARTICLE]->(a:NewsArticle {url: $article_url}) "
            "ON CREATE SET a.title = $article_title, a.published_date = datetime(), a.sentiment_score = $sentiment_score "
            "RETURN n, r, a"
        )
        try:
            self.store.query(query, {
                "entity_id": entity_id,
                "article_title": article_title,
                "article_url": article_url,
                "sentiment_score": sentiment_score
            })
            logger.info(f"Enriched entity {entity_id} with news article: {article_title}")
        except Exception as e:
            logger.error(f"Failed to enrich entity {entity_id} with news: {e}")
