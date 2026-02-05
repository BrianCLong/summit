from summit.frontier.memory.redact import Redactor
from summit.frontier.memory.store import MemoryStore

def test_redact_text():
    redactor = Redactor()
    text = "Contact me at bob@example.com immediately."
    redacted = redactor.redact_text(text)
    assert "<EMAIL>" in redacted
    assert "bob@example.com" not in redacted

def test_redact_nested_obj():
    redactor = Redactor()
    data = {
        "user": {
            "name": "Alice",
            "email": "alice@example.org",
            "history": ["Bought card 1234-5678-9012-3456"]
        }
    }
    redacted = redactor.redact_obj(data)
    assert redacted["user"]["email"] == "<EMAIL>"
    assert "<CREDIT_CARD>" in redacted["user"]["history"][0]

def test_memory_store_auto_redaction():
    store = MemoryStore()
    content = {"message": "Here is my secret: test@test.com"}
    entry_id = store.add(content)

    retrieved = store.get(entry_id)
    assert retrieved["content"]["message"] == "Here is my secret: <EMAIL>"

def test_memory_store_search():
    store = MemoryStore()
    store.add({"note": "Project Alpha details"})
    store.add({"note": "Project Beta details"})

    results = store.search("Alpha")
    assert len(results) == 1
    assert "Alpha" in results[0]["content"]["note"]
