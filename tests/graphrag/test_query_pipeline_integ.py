import pytest
from unittest.mock import patch
from server.src.ai.rag.graph_rag import query_graph_with_rag, block_publish_if_citations_missing

@pytest.mark.integration
class TestGraphRAGQueryPipeline:
    """
    Integration tests for the GraphRAG query pipeline.
    Tests cover end-to-end execution, entity resolution, traversal,
    answer synthesis, and error handling.
    """

    def test_pipeline_end_to_end_alice(self):
        """
        Test end-to-end query execution for a known entity 'Alice'.
        Verifies answer synthesis and citation tracking.
        """
        query = "Who is Alice?"
        subgraph_context = {"nodes": ["Alice"], "edges": []}

        result = query_graph_with_rag(query, subgraph_context)

        assert "Alice" in result["answer"]
        assert "Software Engineer" in result["answer"]
        assert "Tech Solutions" in result["answer"]
        assert any("node:Alice" in c for c in result["citations"])
        assert any("relationship:Alice-WORKS_AT-Tech Solutions" in c for c in result["citations"])
        assert len(result["path_rationales"]) > 0

    def test_pipeline_entity_resolution_and_traversal(self):
        """
        Test that the pipeline correctly resolves entities from the query
        and traverses relationships.
        """
        query = "Who works at Tech Solutions?"
        # We pass Alice in the context to see if it resolves her
        subgraph_context = {"nodes": ["Alice"], "edges": []}

        result = query_graph_with_rag(query, subgraph_context)

        assert "Information about Alice is available in the graph." in result["answer"]
        assert "node:Alice" in result["citations"]
        assert "Node Alice found in subgraph context." in result["path_rationales"][0]

    def test_subgraph_extraction_correctness(self):
        """
        Verify that the pipeline handles different subgraph contexts correctly.
        """
        query = "What is Project Alpha?"
        subgraph_context = {"nodes": ["Project Alpha"], "edges": []}

        result = query_graph_with_rag(query, subgraph_context)

        assert "Project Alpha" in result["answer"]
        assert "Active" in result["answer"]
        assert "node:Project Alpha" in result["citations"]

    def test_answer_synthesis_with_citation_tracking(self):
        """
        Verify that citations are correctly tracked and can be used to
        gate publication.
        """
        query = "Who is Alice?"
        subgraph_context = {"nodes": ["Alice"], "edges": []}

        result = query_graph_with_rag(query, subgraph_context)

        assert len(result["citations"]) > 0
        assert block_publish_if_citations_missing(result) is False

    def test_error_handling_missing_entities(self):
        """
        Test error handling when the query refers to missing entities.
        """
        query = "Who is Charlie?"
        subgraph_context = {"nodes": ["Charlie"], "edges": []}

        result = query_graph_with_rag(query, subgraph_context)

        assert "No relevant information found" in result["answer"]
        assert len(result["citations"]) == 0
        assert block_publish_if_citations_missing(result) is True

    def test_error_handling_malformed_query(self):
        """
        Test the pipeline's resilience to empty or malformed queries.
        """
        result = query_graph_with_rag("", {"nodes": [], "edges": []})
        assert "No relevant information found" in result["answer"]
        assert result["citations"] == []

    def test_pipeline_with_custom_mock_graph(self):
        """
        Test the pipeline with a dynamically mocked knowledge graph.
        """
        custom_kg = {
            "nodes": {
                "Eve": {"type": "Person", "properties": {"name": "Eve", "occupation": "Analyst"}}
            },
            "relationships": []
        }

        with patch('server.src.ai.rag.graph_rag._MOCK_KNOWLEDGE_GRAPH', custom_kg):
            result = query_graph_with_rag("Tell me about Eve", {"nodes": ["Eve"], "edges": []})
            assert "Eve" in result["answer"]
            assert "node:Eve" in result["citations"]

    def test_complex_traversal_simulation(self):
        """
        Simulate a more complex traversal query.
        """
        query = "Show me the path from Alice to Project Alpha"
        subgraph_context = {"nodes": ["Alice", "Project Alpha"], "edges": ["rel-3"]}

        result = query_graph_with_rag(query, subgraph_context)

        assert any(node in result["answer"] for node in ["Alice", "Project Alpha"])
        assert len(result["citations"]) > 0
