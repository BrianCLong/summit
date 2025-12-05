from neo4j import GraphDatabase
import os
from typing import List, Dict, Any

class Neo4jLoader:
    def __init__(self, uri: str = None, user: str = None, password: str = None):
        self.uri = uri or os.getenv("NEO4J_URI", "bolt://neo4j:7687")
        self.user = user or os.getenv("NEO4J_USER", "neo4j")
        self.password = password or os.getenv("NEO4J_PASSWORD", "devpassword")
        self.driver = None

    def connect(self):
        if not self.driver:
            self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))

    def close(self):
        if self.driver:
            self.driver.close()
            self.driver = None

    def load_batch(self, records: List[Dict[str, Any]]):
        """
        Loads a batch of records into Neo4j.
        """
        self.connect()
        with self.driver.session() as session:
            session.execute_write(self._create_nodes_and_rels, records)

    @staticmethod
    def _create_nodes_and_rels(tx, records):
        """
        Cypher query to merge nodes and relationships.
        """
        query = """
        UNWIND $records AS record
        MERGE (a:Author {name: record.author})
        MERGE (p:Post {id: record.id})
        SET p.content = record.content,
            p.timestamp = record.timestamp,
            p.source = record.source
        MERGE (a)-[:WROTE]->(p)
        """
        tx.run(query, records=records)
