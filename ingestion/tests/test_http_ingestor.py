from ingestion.ingestors.http import HTTPIngestor
from ingestion.utils import compute_hash


def test_http_ingestor_normalize_uses_deterministic_hash_when_missing_id() -> None:
    ingestor = HTTPIngestor(producer=None, topic="test", urls=[])
    item = {"timestamp": "2025-01-01T00:00:00Z", "text": "alpha", "source": "unit"}

    normalized = ingestor.normalize(item)

    assert normalized["id"] == compute_hash(item)


def test_http_ingestor_normalize_stable_for_same_payload() -> None:
    ingestor = HTTPIngestor(producer=None, topic="test", urls=[])
    item = {"timestamp": "2025-01-01T00:00:00Z", "text": "alpha", "source": "unit"}

    first = ingestor.normalize(item)
    second = ingestor.normalize(item)

    assert first["id"] == second["id"]
