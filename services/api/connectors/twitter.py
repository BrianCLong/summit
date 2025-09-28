import json, time
from confluent_kafka import Producer
from .util import to_message_record

p = Producer({"bootstrap.servers": "kafka:9092"})

def backfill(since_epoch_ms: int):
    # TODO: plug official API; below is a stub
    for i in range(100):
        msg = {
            "id": f"tw_{since_epoch_ms}_{i}",
            "source": "TWITTER",
            "account_id": f"acc_{i%10}",
            "ts": int(time.time()*1000),
            "text": "sample text #qanon #wwg1wga",
            "url": None,
            "hashtags": ["qanon","wwg1wga"],
            "mentions": [],
            "lang": "en",
            "embed": []  # to be filled by embedding service
        }
        msg = to_message_record(msg)
        p.produce("raw.twitter", json.dumps(msg).encode("utf-8"))
    p.flush()