import os
import sys
import unittest

# Add the project root to sys.path to allow absolute imports
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../"))
sys.path.insert(0, project_root)

from server.src.ai.nl_to_cypher.cypher_sandbox_executor import (
    execute_cypher_in_sandbox,
    rollback_sandbox_changes,
)
from server.src.ai.nl_to_cypher.nl_to_cypher_generator import (
    estimate_query_cost,
    generate_cypher_query,
)


class TestNlToCypherStubs(unittest.TestCase):

    def test_generate_cypher_query_persons(self):
        query = generate_cypher_query("Find all persons")
        self.assertEqual(query, "MATCH (p:Person) RETURN p")

    def test_generate_cypher_query_named_person(self):
        query = generate_cypher_query("Find persons named Alice")
        self.assertEqual(query, "MATCH (p:Person {name: 'Alice'}) RETURN p")

    def test_generate_cypher_query_events_by_source(self):
        query = generate_cypher_query("Show me events by Sensor A")
        self.assertEqual(query, "MATCH (e:Event)-[:HAS_SOURCE]->(s {name: 'Sensor A'}) RETURN e")

    def test_generate_cypher_query_assets_in_location(self):
        query = generate_cypher_query("List assets in location New York")
        self.assertEqual(
            query, "MATCH (a:Asset)-[:LOCATED_AT]->(l:Location {name: 'New York'}) RETURN a"
        )

    def test_generate_cypher_query_unsupported(self):
        query = generate_cypher_query("Show me some data")
        self.assertEqual(query, "// Cypher query not generated for this input")

    def test_estimate_query_cost(self):
        cost = estimate_query_cost("MATCH (n) RETURN n")
        self.assertIn("estimated_rows", cost)
        self.assertIn("estimated_cost_units", cost)

    def test_execute_cypher_in_sandbox_person_query(self):
        # Test with an authorized user
        authorized_user = {"id": "test_user", "roles": ["admin"]}
        result = execute_cypher_in_sandbox(
            "MATCH (p:Person) RETURN p", user_context=authorized_user
        )
        self.assertTrue(result["success"])
        self.assertGreater(len(result["results"]), 0)

    def test_execute_cypher_in_sandbox_access_denied(self):
        # Test with an unauthorized user
        unauthorized_user = {"id": "guest_user", "roles": ["guest"]}
        result = execute_cypher_in_sandbox(
            "MATCH (p:Person) RETURN p", user_context=unauthorized_user
        )
        self.assertFalse(result["success"])
        self.assertIn("Access Denied", result["warnings"][0])

    def test_execute_cypher_in_sandbox_no_user_context(self):
        # Test without user context
        result = execute_cypher_in_sandbox("MATCH (p:Person) RETURN p")
        self.assertFalse(result["success"])
        self.assertIn("Access Denied", result["warnings"][0])

    def test_execute_cypher_in_sandbox_other_query(self):
        # Test with an authorized user for a different query
        authorized_user = {"id": "test_user", "roles": ["admin"]}
        result = execute_cypher_in_sandbox("MATCH (a:Asset) RETURN a", user_context=authorized_user)
        self.assertTrue(result["success"])
        self.assertEqual(len(result["results"]), 0)

    def test_rollback_sandbox_changes(self):
        result = rollback_sandbox_changes("some_transaction_id")
        self.assertTrue(result)


if __name__ == "__main__":
    unittest.main()
