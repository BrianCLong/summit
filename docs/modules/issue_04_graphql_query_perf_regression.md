---
name: 'Issue #4: Backend GraphQL Query Performance Regression'
about: Optimize GraphQL query times for multi-hop neighbor retrieval
title: 'Issue #4: Backend GraphQL Query Performance Regression'
labels: 'bug, performance, backend, graphql'
assignees: ''
---

**Branch**: `fix/graphql-query-perf`

**Status**: Open

**Description**
A recent backend change caused GraphQL query response times for multi-hop neighbor retrieval to increase significantly, from approximately 200ms to 800ms for moderate graphs (~5k nodes). This regression negatively impacts the responsiveness of the IntelGraph UI and overall user experience, especially for complex analytical queries.

**Proposed Solution**
Identify the specific change that introduced the regression (e.g., inefficient database queries, N+1 problems, lack of indexing, ORM misconfiguration). Optimize the data fetching logic, ensure proper indexing, and potentially implement query caching for frequently accessed patterns.

**Code/File Layout**

```
backend/
  graphql/
    resolvers/
      node_resolver.py
      edge_resolver.py
  db/
    neo4j_driver.py
    query_optimizer.py
tests/
  performance/
    test_graphql_queries.py
```

**Python Stub (`node_resolver.py` - Example of potential N+1 issue and fix):**

```python
# backend/graphql/resolvers/node_resolver.py
from typing import List, Dict
from neo4j import AsyncGraphDatabase # Assuming async driver

# Placeholder for database connection
# driver = AsyncGraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "password"))

async def get_node_by_id(node_id: str):
    # Original (potentially inefficient) query
    # query = f"MATCH (n) WHERE n.id = '{node_id}' RETURN n"
    # result = await driver.execute_query(query)
    # return result.single()

    # Optimized query (assuming direct access or batched fetch)
    # This is a conceptual example; actual implementation depends on ORM/driver
    print(f"Fetching node: {node_id}")
    return {"id": node_id, "label": "Concept", "properties": {"name": f"Node {node_id}"}} # Mock data

async def get_multi_hop_neighbors(node_id: str, hops: int = 2) -> List[Dict]:
    """
    Retrieves neighbors up to a specified number of hops.
    This is where N+1 issues often arise if not handled carefully.
    """
    # Inefficient approach (N+1 problem):
    # For each node, fetch its neighbors, then for each of those, fetch their neighbors.
    # This results in many small queries.

    # Optimized Cypher query for Neo4j (single query for multi-hop):
    cypher_query = f"""
    MATCH (start_node) WHERE start_node.id = '{node_id}'
    MATCH (start_node)-[*1..{hops}]-(neighbor)
    RETURN DISTINCT neighbor
    """
    print(f"Executing multi-hop query for {node_id} with {hops} hops:\n{cypher_query}")

    # In a real scenario, you'd execute this via your Neo4j driver
    # results = await driver.execute_query(cypher_query)
    # return [record["neighbor"] for record in results]

    # Mock data for demonstration
    mock_neighbors = []
    for i in range(1, hops + 1):
        mock_neighbors.append({"id": f"{node_id}-neighbor-{i}", "label": "Related", "properties": {"distance": i}})
    return mock_neighbors

# Example GraphQL resolver structure (using Strawberry/Graphene)
# @strawberry.type
# class Query:
#     @strawberry.field
#     async def node(self, id: str) -> Node:
#         return await get_node_by_id(id)

#     @strawberry.field
#     async def multi_hop_neighbors(self, id: str, hops: int = 2) -> List[Node]:
#         return await get_multi_hop_neighbors(id, hops)
```

**Python Stub (`query_optimizer.py` - Conceptual):**

```python
# backend/db/query_optimizer.py
import functools
import time
import json
import redis # Requires `pip install redis`

# Assuming Redis is configured
r = redis.Redis(host='localhost', port=6379, db=0)

def query_cache(ttl_seconds: int = 300):
    """
    Decorator to cache query results in Redis.
    """
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate a cache key based on function name and arguments
            cache_key_parts = [func.__name__] + [str(arg) for arg in args] + [f"{k}={v}" for k, v in kwargs.items()]
            cache_key = ":".join(cache_key_parts)

            cached_result = r.get(cache_key)
            if cached_result:
                print(f"Cache hit for {cache_key}")
                return json.loads(cached_result)

            print(f"Cache miss for {cache_key}. Executing query...")
            result = await func(*args, **kwargs)
            r.setex(cache_key, ttl_seconds, json.dumps(result))
            return result
        return wrapper
    return decorator

# Example usage in node_resolver.py:
# @query_cache(ttl_seconds=60)
# async def get_multi_hop_neighbors(node_id: str, hops: int = 2) -> List[Dict]:
#     # ... existing logic ...
```

**Architecture Sketch (ASCII)**

```
+-------------------+
|  GraphQL Client   |
| (Frontend UI)     |
+-------------------+
        | GraphQL Query
        v
+-------------------+
|  GraphQL Gateway  |
| (e.g., Apollo, GQL)|
+-------------------+
        | Resolves Fields
        v
+-------------------+
|  GraphQL Resolvers|
| (node_resolver.py)|
| - get_node_by_id  |
| - get_multi_hop_  |
|   neighbors       |
+-------------------+
        | Optimized DB Calls
        v
+-------------------+
|  Query Optimizer  |<----->|    Redis Cache    |
| (query_optimizer.py)|
+-------------------+
        |
        v
+-------------------+
|  Neo4j Driver     |
| (neo4j_driver.py) |
+-------------------+
        | Cypher Queries
        v
+-------------------+
|  Graph Database   |
| (e.g., Neo4j)     |
+-------------------+
```

**Sub-tasks:**

- [ ] **Identify Regression Cause:** Analyze recent backend changes (code commits, dependency updates) to pinpoint the exact cause of the performance degradation. Use profiling tools if necessary.
- [ ] **Optimize Cypher Queries:** Review and optimize the Cypher queries used for multi-hop neighbor retrieval in `node_resolver.py` to ensure they are efficient and leverage graph database capabilities.
- [ ] **Address N+1 Problems:** Refactor resolvers to avoid N+1 query patterns by using batching or pre-fetching mechanisms (e.g., DataLoader pattern in GraphQL).
- [ ] **Indexing Review:** Verify that all necessary properties and relationships in the graph database are properly indexed to support fast lookups.
- [ ] **Implement Query Caching:** Introduce a caching layer (e.g., Redis) for frequently executed or expensive GraphQL queries using `query_cache` decorator.
- [ ] **Performance Testing:** Develop automated performance tests (`test_graphql_queries.py`) to continuously monitor GraphQL query response times and prevent future regressions.
- [ ] **Monitor Database Metrics:** Ensure database-level metrics (query execution times, cache hits/misses) are being monitored to identify bottlenecks.
