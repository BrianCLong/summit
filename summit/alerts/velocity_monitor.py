import asyncio
import time
import requests
from typing import Dict, List, Any

class VelocityMonitor:
    def __init__(self, thresholds: Dict[str, Dict[str, float]] = None):
        # Default thresholds per narrative category
        self.thresholds = thresholds or {
            "default": {
                "posts_per_hour": 100,
                "unique_amplifiers_per_hour": 50,
                "platform_spread_count": 3
            }
        }
        self.alert_history: List[Dict[str, Any]] = []
        self.last_alert_times: Dict[str, float] = {}
        self.dedup_window_seconds = 300  # 5 minutes deduplication window
        self.webhooks: List[str] = []
        self.websockets: List[Any] = []

    def set_thresholds(self, category: str, posts_per_hour: float, unique_amplifiers_per_hour: float, platform_spread_count: float):
        self.thresholds[category] = {
            "posts_per_hour": posts_per_hour,
            "unique_amplifiers_per_hour": unique_amplifiers_per_hour,
            "platform_spread_count": platform_spread_count
        }

    def compute_velocity(self, cluster_growth_data: Dict[str, Any]) -> Dict[str, float]:
        """
        Computes velocity metrics from cluster growth data.
        Assumes cluster_growth_data contains:
        - new_posts: int
        - new_amplifiers: int
        - platforms: list of str
        - time_window_hours: float
        """
        time_window = cluster_growth_data.get("time_window_hours", 1.0)
        if time_window <= 0:
            time_window = 1.0

        posts_per_hour = cluster_growth_data.get("new_posts", 0) / time_window
        unique_amplifiers_per_hour = cluster_growth_data.get("new_amplifiers", 0) / time_window
        platform_spread_count = len(cluster_growth_data.get("platforms", []))

        return {
            "posts_per_hour": posts_per_hour,
            "unique_amplifiers_per_hour": unique_amplifiers_per_hour,
            "platform_spread_count": platform_spread_count
        }

    def check_thresholds(self, category: str, metrics: Dict[str, float]) -> bool:
        category_thresholds = self.thresholds.get(category, self.thresholds.get("default", {}))

        if not category_thresholds:
            return False

        if metrics.get("posts_per_hour", 0) > category_thresholds.get("posts_per_hour", float('inf')):
            return True

        if metrics.get("unique_amplifiers_per_hour", 0) > category_thresholds.get("unique_amplifiers_per_hour", float('inf')):
            return True

        if metrics.get("platform_spread_count", 0) > category_thresholds.get("platform_spread_count", float('inf')):
            return True

        return False

    def should_alert(self, narrative_id: str) -> bool:
        current_time = time.time()
        last_time = self.last_alert_times.get(narrative_id, 0)

        if current_time - last_time > self.dedup_window_seconds:
            return True
        return False

    async def trigger_alert(self, narrative_id: str, category: str, metrics: Dict[str, float]):
        if not self.should_alert(narrative_id):
            return

        alert_data = {
            "narrative_id": narrative_id,
            "category": category,
            "metrics": metrics,
            "timestamp": time.time()
        }

        self.alert_history.append(alert_data)
        self.last_alert_times[narrative_id] = time.time()

        # Dispatch to webhooks
        for webhook in self.webhooks:
            try:
                requests.post(webhook, json=alert_data, timeout=5)
            except Exception as e:
                print(f"Failed to send webhook to {webhook}: {e}")

        # Dispatch to websockets
        # In a real app we'd use asyncio to broadcast
        for ws in self.websockets:
            try:
                await ws.send_json(alert_data)
            except Exception as e:
                print(f"Failed to send websocket message: {e}")

    async def process_cluster_data(self, narrative_id: str, category: str, cluster_growth_data: Dict[str, Any]):
        metrics = self.compute_velocity(cluster_growth_data)
        if self.check_thresholds(category, metrics):
            await self.trigger_alert(narrative_id, category, metrics)

    async def poll_loop(self, data_source=None):
        """
        Polls for narrative cluster growth every 60s.
        data_source is a callable that returns a list of dictionaries containing:
        - narrative_id: str
        - category: str
        - cluster_growth_data: Dict
        """
        while True:
            try:
                if data_source:
                    data = data_source()
                    for item in data:
                        await self.process_cluster_data(
                            item["narrative_id"],
                            item["category"],
                            item["cluster_growth_data"]
                        )
            except Exception as e:
                print(f"Error in poll loop: {e}")

            await asyncio.sleep(60)

velocity_monitor = VelocityMonitor()
