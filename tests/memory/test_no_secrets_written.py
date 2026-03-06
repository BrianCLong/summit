from summit.memory.ledger import MemoryLedger


def test_secrets_redacted(tmp_path):
    f = tmp_path / "ledger.jsonl"
    ledger = MemoryLedger(f)
    ledger.append({"event": "login", "secret": "my_password", "api_key": "sk-123"})

    content = f.read_text()
    assert "***" in content
    assert "my_password" not in content
    assert "sk-123" not in content
