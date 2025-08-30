import json
import os
import tempfile

from intelgraph_py.connectors.social.listener import fetch_rss, fetch_twitter
from intelgraph_py.provenance.fabric_client import generate_hash, submit_receipt, verify_receipt


def test_fetch_rss_from_file():
    rss = """
    <rss version="2.0">
      <channel>
        <title>Sample</title>
        <item>
          <title>Hello World</title>
          <link>https://example.com/hello</link>
          <guid>1</guid>
          <pubDate>2025-01-01T00:00:00Z</pubDate>
        </item>
        <item>
          <title>Second</title>
          <link>https://example.com/second</link>
          <guid>2</guid>
        </item>
      </channel>
    </rss>
    """.strip()
    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".xml") as tf:
        tf.write(rss)
        path = tf.name
    try:
        posts = list(fetch_rss(path))
        assert len(posts) == 2
        assert posts[0].id == "1"
        assert posts[0].url == "https://example.com/hello"
    finally:
        os.unlink(path)


def test_fetch_twitter_from_mock_file():
    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".jsonl") as tf:
        tf.write(json.dumps({"id": "123", "text": "sample tweet", "author": "me"}) + "\n")
        path = tf.name
    os.environ["TWITTER_MOCK_FILE"] = path
    try:
        posts = list(fetch_twitter("intelgraph"))
        assert posts and posts[0].id == "123"
    finally:
        os.environ.pop("TWITTER_MOCK_FILE", None)
        os.unlink(path)


def test_fabric_receipts_roundtrip():
    # Ensure receipts go to a temp location by adjusting CWD if needed.
    data = b"payload"
    h = generate_hash(data)
    r = submit_receipt(h, {"k": 1})
    assert r.tx_id and r.hash == h
    r2 = verify_receipt(r.tx_id)
    assert r2 and r2.hash == h and r2.metadata["k"] == 1
