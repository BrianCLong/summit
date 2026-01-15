import logging
from typing import Any

import networkx as nx
from fuzzywuzzy import fuzz

logger = logging.getLogger(__name__)


class EntityResolver:
    """
    Handles Entity Resolution, Disambiguation, and Clustering.
    """

    def __init__(self, similarity_threshold=85):
        self.similarity_threshold = similarity_threshold

    def compute_similarity(self, text1, text2):
        return fuzz.token_set_ratio(text1, text2)

    def cluster_entities(self, entities: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """
        Clusters entities based on name similarity.
        Returns a list of entities with a 'canonical_id' or 'cluster_id'.
        """
        if not entities:
            return []

        # Create a graph where nodes are entity indices
        g = nx.Graph()
        for i in range(len(entities)):
            g.add_node(i)

        # Add edges between similar entities
        # Only compare entities of the same type (label)
        for i in range(len(entities)):
            for j in range(i + 1, len(entities)):
                e1 = entities[i]
                e2 = entities[j]

                if e1.get("label") != e2.get("label"):
                    continue

                sim = self.compute_similarity(e1["text"], e2["text"])
                if sim >= self.similarity_threshold:
                    g.add_edge(i, j, weight=sim)

        # Find connected components (clusters)
        clusters = list(nx.connected_components(g))

        # Assign cluster IDs and resolve canonical name
        resolved_entities = []

        for cluster_idx, cluster_nodes in enumerate(clusters):
            cluster_members = [entities[i] for i in cluster_nodes]

            # Determine canonical name (longest? most frequent? highest confidence?)
            # Here: longest name as it usually contains more info, or highest confidence.
            # Let's use highest total confidence sum or max confidence.

            best_entity = max(
                cluster_members, key=lambda x: (x.get("confidence", 0), len(x["text"]))
            )
            canonical_name = best_entity["text"]
            canonical_type = best_entity.get("label")

            for member in cluster_members:
                member["cluster_id"] = f"cluster_{cluster_idx}"
                member["canonical_name"] = canonical_name
                resolved_entities.append(member)

        # Preserves order roughly? No, re-ordered by cluster.
        # If order matters, we can map back.

        return resolved_entities

    def disambiguate_against_graph(self, entities, graph_store):
        """
        Placeholder for linking entities to existing Knowledge Graph.
        """
        # In a real impl, this would query Neo4j for fuzzy matches
        pass
