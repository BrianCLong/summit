import os
import logging
try:
    from neo4j import GraphDatabase
except ImportError:
    GraphDatabase = None

log = logging.getLogger("summit-fara")

class IntelGraphConnector:
    def __init__(self):
        self.uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        self.user = os.getenv("NEO4J_USER", "neo4j")
        self.password = os.getenv("NEO4J_PASSWORD", "password")
        self.driver = None
        self._connect()

    def _connect(self):
        if GraphDatabase:
            try:
                self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))
                log.info(f"IntelGraph connected to {self.uri}")
            except Exception as e:
                log.warning(f"Failed to connect to IntelGraph: {e}")
        else:
            log.warning("neo4j module not installed. IntelGraph disabled.")

    def check_connection(self) -> bool:
        if not self.driver:
            return False
        try:
            self.driver.verify_connectivity()
            return True
        except Exception:
            return False

    def query(self, cypher: str, params: dict = None):
        """
        Executes a Cypher query against IntelGraph.
        """
        if not self.driver:
            log.debug(f"Mock Query: {cypher}")
            return []

        try:
            with self.driver.session() as session:
                result = session.run(cypher, params or {})
                return [record.data() for record in result]
        except Exception as e:
            log.error(f"Query failed: {e}")
            return []

    def close(self):
        if self.driver:
            self.driver.close()
