from summit.core.agents.document_agent import DocumentAgent


def test_list_documents():
    agent = DocumentAgent("data/raw")
    docs = agent.list_documents()
    assert isinstance(docs, list)
    assert all("document_id" in d and "text" in d for d in docs)
