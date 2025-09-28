from confluent_kafka import Producer
from .util import to_message_record
import time, json
p = Producer({"bootstrap.servers":"kafka:9092"})

def backfill(since_epoch_ms: int):
    # TODO: integrate official/3p
    for i in range(50):
        msg = {
          "id": f"tt_{since_epoch_ms}_{i}",
          "source": "TIKTOK",
          "account_id": f"tt_acc_{i%7}",
          "ts": int(time.time()*1000),
          "text": "sound trending #conspiracy",
          "url": f"https://www.tiktok.com/@user/video/{i}",
          "hashtags": ["conspiracy"],
          "mentions": [],
          "lang": "en"
        }
        p.produce("raw.tiktok", json.dumps(to_message_record(msg)).encode())
    p.flush()