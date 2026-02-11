from importlib import import_module

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


def test_http_ingestor_normalize_preserves_explicit_falsy_id() -> None:
    ingestor = HTTPIngestor(producer=None, topic="test", urls=[])
    item = {"id": "", "timestamp": "2025-01-01T00:00:00Z", "text": "alpha"}

    normalized = ingestor.normalize(item)

    assert normalized["id"] == ""


def test_ingestors_module_imports_without_optional_dependencies() -> None:
    ingestors = import_module("ingestion.ingestors")

    assert ingestors.Ingestor is not None
    assert ingestors.PastebinIngestor is not None


def test_ingestion_star_import_stays_dependency_light() -> None:
    namespace: dict[str, object] = {}

    exec("from ingestion import *", namespace)

    assert "Ingestor" in namespace
    assert "PastebinIngestor" in namespace
    assert "RSSIngestor" not in namespace
    assert "TwitterIngestor" not in namespace


def test_ingestion_all_exposes_only_hard_dependencies() -> None:
    ingestion = import_module("ingestion")

    assert ingestion.__all__ == ["Ingestor", "PastebinIngestor"]
