import json
import logging
from datetime import datetime


class Logger:
    def __init__(self, filepath="experiments.jsonl"):
        self.filepath = filepath
        logging.basicConfig(level=logging.INFO)

    def log(self, event_type: str, payload: dict):
        entry = {"timestamp": datetime.isoformat(datetime.now()), "event": event_type, **payload}
        with open(self.filepath, "a") as f:
            f.write(json.dumps(entry) + "\n")
        logging.info(f"[{event_type}] {payload}")
