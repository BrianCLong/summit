import pytest

@pytest.fixture
def mock_graph_data():
    return {
        "nodes": {
            "Alice": {
                "id": "node-1",
                "type": "Person",
                "properties": {"name": "Alice", "occupation": "Software Engineer"},
            },
            "Bob": {
                "id": "node-2",
                "type": "Person",
                "properties": {"name": "Bob", "occupation": "Project Manager"}
            },
            "Tech Solutions": {
                "id": "node-3",
                "type": "Organization",
                "properties": {"name": "Tech Solutions", "industry": "IT"},
            },
            "Project Alpha": {
                "id": "node-4",
                "type": "Project",
                "properties": {"name": "Project Alpha", "status": "Active"},
            },
        },
        "relationships": [
            {"id": "rel-1", "source": "Alice", "type": "WORKS_AT", "target": "Tech Solutions"},
            {"id": "rel-2", "source": "Bob", "type": "WORKS_AT", "target": "Tech Solutions"},
            {"id": "rel-3", "source": "Alice", "type": "WORKS_ON", "target": "Project Alpha"},
        ],
    }
