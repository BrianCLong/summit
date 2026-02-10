import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class RetrievalContractError(Exception):
    pass

class ContractRetriever:
    """
    Wraps Neo4j client to enforce retrieval contracts:
    1. Mandatory metadata filters (tenant/access scope).
    2. Deterministic ordering of results.
    3. Embedding model consistency (checked at higher level or via metadata).
    """

    def __init__(self, neo4j_client, vector_index_name: str = "summit_vector_index"):
        self.client = neo4j_client
        self.vector_index_name = vector_index_name

    def search(self,
               query_vector: List[float],
               filters: Dict[str, Any],
               top_k: int = 10,
               embedding_model_version: str = None) -> List[Dict[str, Any]]:
        """
        Executes a vector search with mandatory filters and deterministic sorting.
        """

        # 1. Enforce Filters
        if not filters or ("tenant_id" not in filters and "access_scope" not in filters):
            raise RetrievalContractError("Security Violation: Missing mandatory 'tenant_id' or 'access_scope' in filters.")

        # 2. Construct Cypher Query
        # This is a template. In a real implementation, we'd use the vector index.
        # We assume 'filters' matches properties on the node.

        # Construct filter clause
        filter_clauses = []
        params = {"query_vector": query_vector, "top_k": top_k}

        for k, v in filters.items():
            # prevent injection (basic check, parameterized query handles values)
            if not k.isidentifier():
                raise RetrievalContractError(f"Invalid filter key: {k}")
            filter_clauses.append(f"node.{k} = ${k}")
            params[k] = v

        where_clause = " AND ".join(filter_clauses)
        if where_clause:
            where_clause = f" WHERE {where_clause}"

        # Query: Vector search -> Filter -> Return
        # Note: In Neo4j 5.x+, vector index syntax varies. We use a generic approach.
        # CALL db.index.vector.queryNodes($index, $k, $vec) YIELD node, score

        cypher = f"""
        CALL db.index.vector.queryNodes($index_name, $top_k, $query_vector) YIELD node, score
        {where_clause}
        RETURN node, score
        ORDER BY score DESC, node.id ASC
        """
        # Note: Sorting by node.id ASC ensures determinism for ties.

        params["index_name"] = self.vector_index_name

        results = []
        try:
            with self.client.driver.session() as session:
                records = session.read_transaction(
                    lambda tx: tx.run(cypher, **params).data()
                )

                for r in records:
                    node = r["node"]
                    # Extract properties safely
                    props = dict(node) if hasattr(node, 'keys') else {}
                    # If the driver returns a Node object, we might need to serialize it.
                    # Assuming basic dict-like behavior or converting it.

                    item = {
                        "id": props.get("id"),
                        "score": r["score"],
                        "properties": props
                    }
                    results.append(item)

        except Exception as e:
            logger.error(f"Retrieval failed: {e}")
            # For this contract, we might want to fail open or closed. Failing closed.
            raise RetrievalContractError(f"Underlying retrieval error: {e}")

        # 3. Enforce Deterministic Ordering (Client-side fail-safe)
        # Even if Cypher sorts, we ensure it here too, especially if we do post-filtering or fusion later.
        results.sort(key=lambda x: (-x["score"], x.get("id", "")))

        return results
