from neo4j import AsyncGraphDatabase, basic_auth
from typing import List, Dict, Any, Optional
import os

class Neo4jConnector:
    def __init__(self, uri: str, username: str, password: str):
        self._uri = uri
        self._username = username
        self._password = password
        self._driver = None

    async def connect(self):
        if not self._driver:
            self._driver = AsyncGraphDatabase.driver(self._uri, auth=basic_auth(self._username, self._password))
            await self._driver.verify_connectivity()

    async def close(self):
        if self._driver:
            await self._driver.close()
            self._driver = None

    async def fetch_graph_data(self) -> Dict[str, List[Dict[str, Any]]]:
        """
        Fetches all nodes and relationships from the Neo4j database.
        """
        if not self._driver:
            await self.connect()

        nodes = []
        relationships = []

        async with self._driver.session() as session:
            # Fetch all nodes
            result = await session.run("MATCH (n) RETURN n")
            nodes_records = await result.data()
            for record in nodes_records:
                node_data = dict(record['n'])
                node_data['id'] = record['n'].element_id # Use element_id as a unique identifier
                nodes.append(node_data)

            # Fetch all relationships
            result = await session.run("MATCH (n)-[r]->(m) RETURN n, r, m")
            rel_records = await result.data()
            for record in rel_records:
                rel_data = dict(record['r'])
                rel_data['source_id'] = record['n'].element_id
                rel_data['target_id'] = record['m'].element_id
                rel_data['id'] = record['r'].element_id # Use element_id as a unique identifier for relationships
                relationships.append(rel_data)

        return {"nodes": nodes, "relationships": relationships}

    async def update_node_properties(self, node_id: str, properties: Dict[str, Any]):
        """
        Updates properties for a given node by its element_id.
        """
        if not self._driver:
            await self.connect()

        query = f"MATCH (n) WHERE elementId(n) = $node_id SET " + ", ".join([f"n.{k} = ${k}" for k in properties.keys()]) + " RETURN n"
        params = {"node_id": node_id, **properties}

        async with self._driver.session() as session:
            await session.run(query, params)

# Example Usage (for testing purposes, not part of the main app flow)
async def main():
    uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    username = os.getenv("NEO4J_USERNAME", "neo4j")
    password = os.getenv("NEO4J_PASSWORD", "password")

    connector = Neo4jConnector(uri, username, password)
    try:
        await connector.connect()
        print("Connected to Neo4j")

        # Example: Fetch graph data
        # graph_data = await connector.fetch_graph_data()
        # print(f"Fetched {len(graph_data['nodes'])} nodes and {len(graph_data['relationships'])} relationships")

        # Example: Update a node property (replace with a real node ID from your DB)
        # await connector.update_node_properties("4:a0b1c2d3e4f5g6h7i8j9k0l1", {"community_id": "community_0"})
        # print("Node property updated")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        await connector.close()
        print("Disconnected from Neo4j")

if __name__ == '__main__':
    import asyncio
    asyncio.run(main())
