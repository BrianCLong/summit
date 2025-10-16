"""
Run a minimal smoke test for the Python MVP pieces without external services.

This validates:
- RSS connector can parse a local file
- Twitter connector can read mock file
- Fabric provenance receipts persist and verify locally
"""

import json
import os
import sys
import tempfile
from pathlib import Path

# Ensure local python package is importable
ROOT = Path(__file__).resolve().parents[1]
PY_SRC = ROOT / "python"
if str(PY_SRC) not in sys.path:
    sys.path.insert(0, str(PY_SRC))

from intelgraph_py.connectors.social.listener import fetch_rss, fetch_twitter
from intelgraph_py.provenance.fabric_client import generate_hash, submit_receipt, verify_receipt


def ok(label):
    print(f"[OK] {label}")


def main():
    # RSS via local file
    rss = """
    <rss version=\"2.0\">
      <channel>
        <title>Sample</title>
        <item>
          <title>Hello World</title>
          <link>https://example.com/hello</link>
          <guid>1</guid>
          <pubDate>2025-01-01T00:00:00Z</pubDate>
        </item>
      </channel>
    </rss>
    """.strip()
    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".xml") as tf:
        tf.write(rss)
        path = tf.name
    posts = list(fetch_rss(path))
    assert posts and posts[0].id == "1"
    ok("RSS local parsing")

    # Twitter via mock file
    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".jsonl") as tf:
        tf.write(json.dumps({"id": "t1", "text": "hello", "author": "me"}) + "\n")
        mock_path = tf.name
    os.environ["TWITTER_MOCK_FILE"] = mock_path
    try:
        posts = list(fetch_twitter("intelgraph"))
        assert posts and posts[0].id == "t1"
        ok("Twitter mock file parsing")
    finally:
        os.environ.pop("TWITTER_MOCK_FILE", None)

    # Fabric receipts
    h = generate_hash(b"payload")
    rcpt = submit_receipt(h, {"env": "test"})
    assert rcpt.tx_id
    rcpt2 = verify_receipt(rcpt.tx_id)
    assert rcpt2 and rcpt2.hash == h and rcpt2.metadata.get("env") == "test"
    ok("Fabric receipt roundtrip")

    print("\nSmoke tests completed successfully.")


if __name__ == "__main__":
    main()
