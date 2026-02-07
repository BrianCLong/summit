from benchmarks.der2.redaction import REDACTED_TEXT, redact_record


def test_redacts_document_text() -> None:
    record = {"doc_text": "secret", "metadata": {"text": "inner"}, "id": "doc-1"}
    redacted = redact_record(record)

    assert redacted["doc_text"] == REDACTED_TEXT
    assert redacted["metadata"]["text"] == REDACTED_TEXT
    assert redacted["id"] == "doc-1"
