class GVGPlanner:
    """
    Graph-Vector-Graph (GVG) Planner for hybrid retrieval.
    Orchestrates between vector-based seed discovery and graph-based expansion.
    """
    def __init__(self, similarity_threshold=0.7, max_depth=3):
        self.similarity_threshold = similarity_threshold
        self.max_depth = max_depth

    def plan_gvg(self, query, initial_entities=None):
        """
        Generates a multi-stage retrieval plan:
        1. Vector search for similar entities/concepts if initial_entities is empty.
        2. Graph traversal from discovered seeds.
        3. Re-ranking or further vector enrichment if needed.
        """
        plan = {
            "stages": [
                {
                    "stage": 1,
                    "name": "SeedDiscovery",
                    "type": "vector",
                    "params": {
                        "query": query,
                        "limit": 10,
                        "threshold": self.similarity_threshold
                    }
                },
                {
                    "stage": 2,
                    "name": "GraphExpansion",
                    "type": "graph",
                    "params": {
                        "hops": self.max_depth,
                        "limit": 50,
                        "direction": "BOTH"
                    }
                },
                {
                    "stage": 3,
                    "name": "Justification",
                    "type": "evidence",
                    "params": {
                        "generate_proof": True,
                        "min_confidence": 0.5
                    }
                }
            ],
            "metadata": {
                "planner": "GVGPlanner v1.1",
                "intent": "Hybrid Retrieval",
                "constraints": {
                    "similarity_threshold": self.similarity_threshold,
                    "max_depth": self.max_depth
                }
            }
        }
        return plan

class HybridPlanner:
    def __init__(self, similarity_threshold=0.7, max_depth=3):
        self.gvg = GVGPlanner(similarity_threshold, max_depth)

    def plan(self, query):
        """
        Plan a hybrid retrieval query using GVG as the default strategy.
        """
        return self.gvg.plan_gvg(query)
