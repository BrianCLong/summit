import os
import sys
import unittest

# Add the project root to sys.path to allow absolute imports
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../"))
sys.path.insert(0, project_root)

from server.src.ai.rag.graph_rag import block_publish_if_citations_missing, query_graph_with_rag


class TestGraphRagStubs(unittest.TestCase):

    def test_query_graph_with_rag_alice(self):
        subgraph = {"nodes": ["Alice", "Tech Solutions", "Project Alpha"], "edges": []}
        result = query_graph_with_rag("Who is Alice?", subgraph)
        self.assertIn("Alice is a Software Engineer.", result["answer"])
        self.assertIn("She works at Tech Solutions.", result["answer"])
        self.assertIn("She works on Project Alpha.", result["answer"])
        self.assertGreater(len(result["citations"]), 0)
        self.assertGreater(len(result["path_rationales"]), 0)

    def test_query_graph_with_rag_project_alpha(self):
        subgraph = {"nodes": ["Project Alpha"], "edges": []}
        result = query_graph_with_rag("What is Project Alpha?", subgraph)
        self.assertIn("Project Alpha is a project with status: Active.", result["answer"])
        self.assertGreater(len(result["citations"]), 0)
        self.assertGreater(len(result["path_rationales"]), 0)

    def test_query_graph_with_rag_not_found(self):
        subgraph = {"nodes": ["NonExistent"], "edges": []}
        result = query_graph_with_rag("Who is Bob?", subgraph)
        self.assertIn("No relevant information", result["answer"])
        self.assertEqual(len(result["citations"]), 0)
        self.assertEqual(len(result["path_rationales"]), 0)

    def test_block_publish_if_citations_missing_true(self):
        content = {"answer": "Some answer", "citations": []}
        self.assertTrue(block_publish_if_citations_missing(content))

    def test_block_publish_if_citations_missing_false(self):
        content = {"answer": "Some answer", "citations": ["citation1"]}
        self.assertFalse(block_publish_if_citations_missing(content))


if __name__ == "__main__":
    unittest.main()
