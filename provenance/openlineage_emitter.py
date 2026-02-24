import json
import os
import sys
import time
import uuid
import urllib.request

OL_ENDPOINT = os.getenv("OPENLINEAGE_ENDPOINT")
NAMESPACE = os.getenv("OPENLINEAGE_NAMESPACE", "summit-sync")


def emit_event(event_type: str, facets: dict) -> None:
    payload = {
        "eventTime": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "eventType": event_type,
        "producer": "summit-sync/0.1",
        "run": {"runId": str(uuid.uuid4())},
        "job": {"namespace": NAMESPACE, "name": "summit-sync"},
        "inputs": [],
        "outputs": [],
        "facets": facets,
    }
    try:
        if OL_ENDPOINT:
            req = urllib.request.Request(
                OL_ENDPOINT.rstrip("/") + "/api/v1/lineage",
                data=json.dumps(payload).encode(),
                headers={"Content-Type": "application/json"},
            )
            urllib.request.urlopen(req, timeout=2).read()
        print("OPENLINEAGE_EVENT_OK", event_type)
        print("summit_openlineage_success_total=1")
    except Exception as exc:
        print("OPENLINEAGE_EVENT_ERR", event_type, str(exc), file=sys.stderr)
