import os
import json
import datetime
import uuid
import requests
import yaml

class OpenLineageProducer:
    def __init__(self, config_path="config/openlineage_settings.yaml"):
        with open(config_path, "r") as f:
            self.config = yaml.safe_load(f)
        self.namespace = self.config.get("namespace", "summit")
        self.producer = self.config.get("producer", "summit-openlineage-producer")
        self.endpoint = os.environ.get("OPENLINEAGE_URL", self.config.get("endpoint", "http://localhost:5000/api/v1/lineage"))
        self.enabled = self.config.get("enabled", True)
        self.log_path = self.config.get("log_path", "lineage_events.log")

    def emit(self, event_type, job_name, run_id, inputs=None, outputs=None, job_facets=None, run_facets=None):
        if not self.enabled:
            return

        event = {
            "eventType": event_type,
            "eventTime": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "run": {
                "runId": run_id,
                "facets": run_facets or {}
            },
            "job": {
                "namespace": self.namespace,
                "name": job_name,
                "facets": job_facets or {}
            },
            "producer": self.producer,
            "inputs": inputs or [],
            "outputs": outputs or []
        }

        if self.endpoint:
            try:
                requests.post(self.endpoint, json=event, timeout=5)
            except Exception as e:
                print(f"Failed to emit OpenLineage event: {e}")

        # Also log to a local file for debugging if needed
        if self.log_path:
            with open(self.log_path, "a") as f:
                f.write(json.dumps(event) + "\n")

    def start_job(self, job_name, run_id, inputs=None):
        self.emit("START", job_name, run_id, inputs=inputs)

    def complete_job(self, job_name, run_id, outputs=None):
        self.emit("COMPLETE", job_name, run_id, outputs=outputs)

    def fail_job(self, job_name, run_id):
        self.emit("FAIL", job_name, run_id)
