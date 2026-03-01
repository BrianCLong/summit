import urllib.request
import json
import uuid
from datetime import datetime, timezone
import os

def generate_event(event_type, run_id):
    return {
        "eventType": event_type,
        "eventTime": datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z'),
        "run": {
            "runId": run_id,
            "facets": {}
        },
        "job": {
            "namespace": "summit",
            "name": "ingest.widgets",
            "facets": {}
        },
        "inputs": [],
        "outputs": [],
        "producer": "https://github.com/Summit/maestro",
        "schemaURL": "https://openlineage.io/spec/1-0-5/OpenLineage.json"
    }

def main():
    run_id = str(uuid.uuid4())
    url = os.environ.get("OPENLINEAGE_URL", "http://localhost:8080")

    events = [
        generate_event("START", run_id),
        generate_event("COMPLETE", run_id)
    ]

    for event in events:
        req = urllib.request.Request(
            f"{url}/api/v1/lineage",
            data=json.dumps(event).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        try:
            with urllib.request.urlopen(req) as response:
                pass
        except Exception as e:
            print(f"Failed to send {event['eventType']} event to {url}: {e}")

if __name__ == "__main__":
    main()
