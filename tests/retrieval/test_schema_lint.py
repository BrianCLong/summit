import unittest
from unittest.mock import MagicMock
from retrieval.neo4j.schema_lint import SchemaLinter

class TestSchemaLinter(unittest.TestCase):
    def test_lint_warnings(self):
        client = MagicMock()
        session = MagicMock()
        client.driver.session.return_value.__enter__.return_value = session

        # Mock schema result
        # Case 1: Person has name, but no ACL.
        # Case 2: Document has embedding, tenant_id, but no embedding_model.
        schema_data = [
            {"nodeLabels": ["Person"], "propertyName": "name", "propertyTypes": ["String"]},
            {"nodeLabels": ["Document"], "propertyName": "embedding", "propertyTypes": ["List<Float>"]},
            {"nodeLabels": ["Document"], "propertyName": "tenant_id", "propertyTypes": ["String"]},
        ]

        def mock_read_tx(func):
            tx = MagicMock()
            tx.run.return_value.data.return_value = schema_data
            return func(tx)

        session.read_transaction = mock_read_tx

        linter = SchemaLinter(client)
        warnings = linter.lint()

        print("\n".join(warnings))

        # Person missing ACL
        self.assertTrue(any("Person" in w and "ACL" in w for w in warnings))
        # Document has ACL (tenant_id) so no ACL warning, but has embedding so needs provenance
        self.assertTrue(any("Document" in w and "provenance" in w for w in warnings))

if __name__ == "__main__":
    unittest.main()
