import time
import uuid
from dataclasses import asdict
from datetime import datetime
from typing import Any, Dict, List, Optional

import numpy as np

# Mockable external dependencies
try:
    from qdrant_client import QdrantClient
    from qdrant_client.http import models as qmodels
except ImportError:
    QdrantClient = None
    qmodels = None

try:
    from neo4j import GraphDatabase
except ImportError:
    GraphDatabase = None

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None

from .moment import Moment


class MemoryRetriever:
    """
    Retrieval system for ambient memory.
    Implements a hybrid backend combining vector search (Qdrant) and graph search (Neo4j).
    """
    def __init__(self, qdrant_url: Optional[str] = ":memory:", neo4j_uri: Optional[str] = None, neo4j_auth: Optional[tuple] = None):
        # In-memory mock storage fallback
        self._moments: list[Moment] = []

        # Initialize Embedding Model
        self.encoder = None
        if SentenceTransformer:
            self.encoder = SentenceTransformer("all-MiniLM-L6-v2")

        # Initialize Qdrant Vector Store
        self.qdrant = None
        self.collection_name = "moments"
        if QdrantClient:
            self.qdrant = QdrantClient(qdrant_url) if qdrant_url == ":memory:" else QdrantClient(url=qdrant_url)
            # Create collection if it doesn't exist
            if qmodels and self.encoder:
                try:
                    collections = self.qdrant.get_collections().collections
                    if not any(c.name == self.collection_name for c in collections):
                        self.qdrant.create_collection(
                            collection_name=self.collection_name,
                            vectors_config=qmodels.VectorParams(
                                size=self.encoder.get_sentence_embedding_dimension(),
                                distance=qmodels.Distance.COSINE
                            )
                        )
                except Exception as e:
                    print(f"Failed to initialize Qdrant collection: {e}")

        # Initialize Neo4j Graph Store
        self.neo4j_driver = None
        if GraphDatabase and neo4j_uri and neo4j_auth:
            try:
                self.neo4j_driver = GraphDatabase.driver(neo4j_uri, auth=neo4j_auth)
            except Exception as e:
                print(f"Failed to initialize Neo4j driver: {e}")


    def insert(self, moment: Moment) -> None:
        """
        Store a moment in the underlying dual indices.
        """
        # Save locally for fallback/testing
        self._moments.append(moment)

        # 1. Vector Store Insertion (Qdrant)
        if self.qdrant and self.encoder and qmodels:
            try:
                vector = self.encoder.encode(moment.text).tolist()
                payload = {
                    "id": moment.id,
                    "timestamp": moment.timestamp.isoformat(),
                    "source_app": moment.source_app,
                    "uri": moment.uri,
                    "title": moment.title,
                    "text": moment.text,
                    "content_hash": moment.content_hash
                }

                # Qdrant requires UUIDs or integers as IDs
                try:
                    point_id = str(uuid.UUID(moment.id))
                except ValueError:
                    # Fallback if id is not a valid UUID string
                    point_id = str(uuid.uuid5(uuid.NAMESPACE_OID, moment.id))

                self.qdrant.upsert(
                    collection_name=self.collection_name,
                    points=[
                        qmodels.PointStruct(
                            id=point_id,
                            vector=vector,
                            payload=payload
                        )
                    ]
                )
            except Exception as e:
                print(f"Failed to insert into Qdrant: {e}")

        # 2. Graph Store Insertion (Neo4j)
        if self.neo4j_driver:
            try:
                with self.neo4j_driver.session() as session:
                    query = """
                    MERGE (a:App {name: $source_app})
                    MERGE (m:Moment {id: $moment_id})
                    SET m.text = $text, m.timestamp = $timestamp, m.uri = $uri
                    MERGE (m)-[:CREATED_IN]->(a)
                    """
                    session.run(
                        query,
                        source_app=moment.source_app,
                        moment_id=moment.id,
                        text=moment.text,
                        timestamp=moment.timestamp.isoformat(),
                        uri=moment.uri
                    )
            except Exception as e:
                print(f"Failed to insert into Neo4j: {e}")

    def search(self, query: str, limit: int = 5) -> list[dict[str, Any]]:
        """
        Hybrid search across vector and graph to retrieve relevant moments.
        Returns formatted moments with citations.
        """
        start_time = time.time()
        results = []
        metrics = {
            "latency_ms": 0,
            "cost_estimate_tokens": len(query.split()), # Simple cost mock
            "failure_modes": []
        }

        # Keep track of scores to blend
        blended_scores = {}
        retrieved_moments = {}

        # 1. Semantic Search (Qdrant)
        if self.qdrant and self.encoder:
            try:
                query_vector = self.encoder.encode(query).tolist()

                # We use query_points
                search_results = self.qdrant.query_points(
                    collection_name=self.collection_name,
                    query=query_vector,
                    limit=limit
                ).points

                for hit in search_results:
                    # Filter out low relevance hits. Qdrant cosine similarity is roughly [-1, 1].
                    # Let's say we only care about hits with > 0.4 score for "semantic match"
                    if hit.score < 0.35:
                        continue

                    payload = hit.payload
                    m_id = payload.get("id")

                    original_m = next((m for m in self._moments if m.id == m_id), None)
                    if not original_m:
                        original_m = Moment(
                            id=m_id,
                            timestamp=datetime.fromisoformat(payload.get("timestamp")),
                            source_app=payload.get("source_app"),
                            uri=payload.get("uri"),
                            title=payload.get("title"),
                            text=payload.get("text"),
                            content_hash=payload.get("content_hash")
                        )
                        self._moments.append(original_m)

                    if original_m:
                        blended_scores[m_id] = hit.score * 0.7 # Vector weight
                        retrieved_moments[m_id] = original_m
            except Exception as e:
                metrics["failure_modes"].append(f"Qdrant search failed: {e}")

        # 2. Graph Search (Neo4j) - context expansion
        if self.neo4j_driver:
            try:
                with self.neo4j_driver.session() as session:
                    # Find moments created in the same app as the vector results, or simple keyword match
                    query_graph = """
                    MATCH (m:Moment)-[:CREATED_IN]->(a:App)
                    WHERE toLower(m.text) CONTAINS toLower($query) OR toLower(m.uri) CONTAINS toLower($query)
                    RETURN m.id AS id, 1.0 AS graph_score
                    LIMIT $limit
                    """
                    graph_results = session.run(query_graph, query=query.lower(), limit=limit)

                    for record in graph_results:
                        m_id = record["id"]
                        score = record["graph_score"]

                        if m_id in blended_scores:
                            blended_scores[m_id] += score * 0.3 # Graph weight
                        else:
                            original_m = next((m for m in self._moments if m.id == m_id), None)
                            if original_m:
                                blended_scores[m_id] = score * 0.3
                                retrieved_moments[m_id] = original_m
            except Exception as e:
                metrics["failure_modes"].append(f"Neo4j search failed: {e}")

        # 3. Fallback / Mock Search if no backends available (or if no results found)
        query_lower = query.lower()
        sorted_moments = sorted(self._moments, key=lambda x: x.timestamp, reverse=True)
        for m in sorted_moments:
            if query_lower in m.text.lower() or query_lower in m.title.lower():
                if m.id not in blended_scores:
                    blended_scores[m.id] = 1.0
                    retrieved_moments[m.id] = m

            if len(blended_scores) >= limit:
                break

        # Format Results
        # Sort by blended score descending
        sorted_m_ids = sorted(blended_scores.keys(), key=lambda k: blended_scores[k], reverse=True)

        for m_id in sorted_m_ids[:limit]:
            m = retrieved_moments[m_id]
            formatted_result = {
                "moment": m,
                "evidence_citation": {
                    "source": m.source_app,
                    "timestamp": m.timestamp.isoformat(),
                    "uri": m.uri
                },
                "score": blended_scores[m_id],
                "evaluation_metrics": metrics
            }
            results.append(formatted_result)

        # Update final latency
        metrics["latency_ms"] = (time.time() - start_time) * 1000

        return results
