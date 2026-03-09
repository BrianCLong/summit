import json

from ingestion.ingestors.jsonl import JSONLIngestor


def test_jsonl_ingestor_reads_lines_and_normalizes(tmp_path) -> None:
    path = tmp_path / "events.jsonl"
    records = [
        {"id": "evt-1", "timestamp": "2026-01-01T00:00:00Z", "message": "alpha"},
        {"timestamp": "2026-01-01T01:00:00Z", "text": "beta", "source": "lab"},
    ]
    path.write_text("\n".join(json.dumps(record) for record in records), encoding="utf-8")

    ingestor = JSONLIngestor(producer=None, topic="raw.posts", files=[str(path)])

    payload = [ingestor.normalize(record) for record in ingestor.fetch()]

    assert payload[0]["id"] == "evt-1"
    assert payload[0]["text"] == "alpha"
    assert payload[1]["platform"] == "jsonl"
    assert payload[1]["id"]
