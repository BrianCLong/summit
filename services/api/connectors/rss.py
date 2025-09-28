from confluent_kafka import Producer
from .util import to_message_record
import feedparser, json, time, os

RSS_FEEDS = os.getenv("RSS_FEEDS","https://r.jina.ai/http://feeds.bbci.co.uk/news/rss.xml").split(",")
p = Producer({"bootstrap.servers":"kafka:9092"})

def backfill(_since: int):
    for feed in RSS_FEEDS:
        f = feedparser.parse(feed)
        for e in f.entries[:50]:
            msg = {
              "id": e.get("id") or e.get("link"),
              "source": "RSS",
              "account_id": e.get("source","rss"),
              "ts": int(time.time()*1000),
              "text": e.get("title"," ") + " " + e.get("summary"," "),
              "url": e.get("link"),
              "hashtags": [],
              "mentions": [],
              "lang": "en"
            }
            p.produce("raw.rss", json.dumps(to_message_record(msg)).encode())
    p.flush()