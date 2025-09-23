import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from apps.ingest import ingest


def test_csv_ingestion():
    data = "name,age\nAlice,30\nBob,25\n"
    records = ingest(data, "csv")
    assert records == [{"name": "Alice", "age": "30"}, {"name": "Bob", "age": "25"}]


def test_json_ingestion():
    data = '[{"name": "Carol", "age": 28}, {"name": "Dan", "age": 32}]'
    records = ingest(data, "json")
    assert records[0]["name"] == "Carol"
    assert records[1]["age"] == 32


def test_rss_ingestion():
    data = (
        "<?xml version='1.0'?><rss version='2.0'><channel>"
        "<title>Sample Feed</title>"
        "<item><title>Item 1</title><link>http://example.com/1</link></item>"
        "<item><title>Item 2</title><link>http://example.com/2</link></item>"
        "</channel></rss>"
    )
    records = ingest(data, "rss")
    assert len(records) == 2
    assert records[0]["title"] == "Item 1"
