# server/src/ai/rag/graph_rag.py

# Mock Knowledge Graph (for demonstration purposes)
_MOCK_KNOWLEDGE_GRAPH = {
    "nodes": {
        "Alice": {
            "type": "Person",
            "properties": {"name": "Alice", "occupation": "Software Engineer"},
        },
        "Bob": {"type": "Person", "properties": {"name": "Bob", "occupation": "Project Manager"}},
        "Tech Solutions": {
            "type": "Organization",
            "properties": {"name": "Tech Solutions", "industry": "IT"},
        },
        "Project Alpha": {
            "type": "Project",
            "properties": {"name": "Project Alpha", "status": "Active"},
        },
    },
    "relationships": [
        {"source": "Alice", "type": "WORKS_AT", "target": "Tech Solutions"},
        {"source": "Bob", "type": "WORKS_AT", "target": "Tech Solutions"},
        {"source": "Alice", "type": "WORKS_ON", "target": "Project Alpha"},
    ],
}


def query_graph_with_rag(natural_language_query: str, subgraph_context: dict) -> dict:
    """
    Performs RAG (Retrieval Augmented Generation) over subgraphs.
    Simulates looking up information in a mock knowledge graph.
    Returns generated answer with citations and path rationales.
    """
    print(f"Performing RAG for: {natural_language_query} with subgraph: {subgraph_context}")

    answer = "No relevant information found in the provided subgraph or mock knowledge graph."
    citations = []
    path_rationales = []

    query_lower = natural_language_query.lower()

    # Simulate retrieval from mock knowledge graph based on query and subgraph context
    if "who is alice" in query_lower:
        if "Alice" in _MOCK_KNOWLEDGE_GRAPH["nodes"]:
            alice_node = _MOCK_KNOWLEDGE_GRAPH["nodes"]["Alice"]
            answer = f"Alice is a {alice_node['properties']['occupation']}."
            citations.append(f"node:{alice_node['properties']['name']}")

            # Find relationships involving Alice
            for rel in _MOCK_KNOWLEDGE_GRAPH["relationships"]:
                if rel["source"] == "Alice" and rel["type"] == "WORKS_AT":
                    target_org = rel["target"]
                    answer += f" She works at {target_org}."
                    citations.append(f"relationship:{rel['source']}-{rel['type']}-{rel['target']}")
                if rel["source"] == "Alice" and rel["type"] == "WORKS_ON":
                    target_project = rel["target"]
                    answer += f" She works on {target_project}."
                    citations.append(f"relationship:{rel['source']}-{rel['type']}-{rel['target']}")
            path_rationales.append(
                "Information retrieved from Alice's node and related entities via relationships."
            )

    elif "what is project alpha" in query_lower:
        if "Project Alpha" in _MOCK_KNOWLEDGE_GRAPH["nodes"]:
            project_node = _MOCK_KNOWLEDGE_GRAPH["nodes"]["Project Alpha"]
            answer = (
                f"Project Alpha is a project with status: {project_node['properties']['status']}."
            )
            citations.append(f"node:{project_node['properties']['name']}")
            path_rationales.append("Information retrieved directly from Project Alpha's node.")

    # Fallback if no specific match
    if not citations and subgraph_context.get("nodes"):
        for node_name in subgraph_context["nodes"]:
            if node_name in _MOCK_KNOWLEDGE_GRAPH["nodes"]:
                answer = f"Information about {node_name} is available in the graph."
                citations.append(f"node:{node_name}")
                path_rationales.append(f"Node {node_name} found in subgraph context.")
                break

    return {"answer": answer, "citations": citations, "path_rationales": path_rationales}


def block_publish_if_citations_missing(generated_content: dict) -> bool:
    """
    Stub for blocking publication if citations are missing from generated content.
    """
    print(f"Checking citations for publication: {generated_content}")
    return not generated_content.get("citations")
