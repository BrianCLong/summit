from ingestion.ingestors.factory import build_ingestors
from ingestion.ingestors.github_events import GitHubEventsIngestor
from ingestion.ingestors.http import HTTPIngestor
from ingestion.ingestors.jsonl import JSONLIngestor


def test_build_ingestors_supports_new_and_existing_sources() -> None:
    config = [
        {"type": "rss", "feed_urls": ["https://example.com/feed"]},
        {"type": "http", "urls": ["https://example.com/api"]},
        {"type": "jsonl", "files": ["/tmp/events.jsonl"]},
        {"type": "github-events", "repositories": ["octocat/Hello-World"]},
    ]

    ingestors = build_ingestors(producer=None, topic="raw.posts", source_configs=config)

    assert any(isinstance(ingestor, HTTPIngestor) for ingestor in ingestors)
    assert any(isinstance(ingestor, JSONLIngestor) for ingestor in ingestors)
    assert any(isinstance(ingestor, GitHubEventsIngestor) for ingestor in ingestors)
