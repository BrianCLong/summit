import os
import sys
import types

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from ingestion.ingestors import PastebinIngestor, RSSIngestor, TwitterIngestor


class DummyProducer:
    def __init__(self):
        self.sent = []

    def send(self, topic, value):
        self.sent.append((topic, value))


def test_rss_ingestor_emits_normalized_items(monkeypatch):
    def fake_parse(url):
        return types.SimpleNamespace(entries=[{"id": "1", "title": "hi", "link": "x"}])

    monkeypatch.setattr("ingestion.ingestors.rss.feedparser.parse", fake_parse)
    prod = DummyProducer()
    ing = RSSIngestor(prod, "topic", ["feed"])
    ing.run()
    assert prod.sent[0][1]["platform"] == "rss"


def test_twitter_ingestor(monkeypatch):
    class DummyAPI:
        def sample_stream(self):
            return [{"id_str": "2", "text": "hi", "user": {"screen_name": "bob"}, "created_at": 0}]

    prod = DummyProducer()
    ing = TwitterIngestor(prod, "topic", DummyAPI())
    ing.run()
    assert prod.sent[0][1]["platform"] == "twitter"


def test_pastebin_ingestor():
    class DummyAPI:
        def recent_pastes(self):
            return [{"key": "3", "content": "hi", "title": "t", "date": 0}]

    prod = DummyProducer()
    ing = PastebinIngestor(prod, "topic", DummyAPI())
    ing.run()
    assert prod.sent[0][1]["platform"] == "pastebin"
