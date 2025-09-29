from intelgraph_py.threat_feeds import normalize_indicator, match_indicator
from intelgraph_py.tasks import ingest_otx_feed


def test_normalize_indicator_tags_source_timestamp():
  ind = normalize_indicator("1.2.3.4", "ip", "otx")
  assert ind["value"] == "1.2.3.4"
  assert ind["type"] == "ip"
  assert ind["source"] == "otx"
  assert "fetched_at" in ind


def test_match_indicator_fuzzy():
  existing = ["1.2.3.4", "malicious.com"]
  assert match_indicator("malici0us.com", existing, threshold=80) == "malicious.com"


def test_ingest_otx_feed(monkeypatch):
  sample = [normalize_indicator("1.2.3.4", "ip", "alienvault_otx")]
  monkeypatch.setattr(
    "intelgraph_py.tasks.fetch_otx_indicators",
    lambda: sample
  )
  result = ingest_otx_feed(existing=["1.2.3.4"])
  assert result[0]["matched"] == "1.2.3.4"
