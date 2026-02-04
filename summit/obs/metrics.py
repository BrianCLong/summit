# summit/obs/metrics.py
import time

class Metrics:
    def __init__(self):
        self.metrics = []

    def log_latency(self, workflow_id, duration_ms):
        self.metrics.append({
            "type": "latency",
            "workflow_id": workflow_id,
            "value": duration_ms,
            "timestamp": time.time()
        })

    def log_cost(self, workflow_id, cost_usd):
        self.metrics.append({
            "type": "cost",
            "workflow_id": workflow_id,
            "value": cost_usd,
            "timestamp": time.time()
        })
