import yaml
import time
import random
import sys
import os

class CostGuard:
    def __init__(self, quota_file):
        self.quotas = self._load_quotas(quota_file)
        # In a real system, this would connect to a metrics store or query log
        self.usage_mock = {
            "tenant-a": {"spend": 950, "slow_queries": 0},
            "tenant-b": {"spend": 1200, "slow_queries": 2}
        }

    def _load_quotas(self, quota_file):
        # Mock loading if file doesn't exist for demo
        if not os.path.exists(quota_file):
            print(f"Warning: Quota file {quota_file} not found. Using defaults.")
            return {"default": {"budget": 1000}}

        with open(quota_file, 'r') as f:
            return yaml.safe_load(f)

    def check_budgets(self):
        print("--- Cost Guard: Checking Budgets ---")
        for tenant, usage in self.usage_mock.items():
            budget = self.quotas.get(tenant, {}).get("budget", self.quotas.get("default", {}).get("budget", 1000))
            spend = usage["spend"]

            print(f"Tenant: {tenant} | Spend: ${spend} | Budget: ${budget}")
            if spend > budget:
                print(f"  [ALERT] Budget exceeded for {tenant}!")
                # In reality: trigger alert or throttle
            elif spend > budget * 0.9:
                print(f"  [WARNING] Budget approaching limit for {tenant}.")
            else:
                print(f"  [OK] Budget within limits.")

    def kill_slow_queries(self, threshold_ms=5000):
        print(f"--- Cost Guard: Killing Slow Queries (> {threshold_ms}ms) ---")
        # Simulate checking active queries
        active_queries = [
            {"id": "q1", "tenant": "tenant-a", "duration_ms": 120},
            {"id": "q2", "tenant": "tenant-b", "duration_ms": 7500}, # Slow!
            {"id": "q3", "tenant": "tenant-c", "duration_ms": 400},
        ]

        killed_count = 0
        for q in active_queries:
            if q["duration_ms"] > threshold_ms:
                print(f"  [KILL] Terminating query {q['id']} for {q['tenant']} (Duration: {q['duration_ms']}ms)")
                killed_count += 1

        print(f"Total queries killed: {killed_count}")
        return killed_count

if __name__ == "__main__":
    # Create a dummy quota file for the demo if it doesn't exist
    quota_path = "finops/resource-quota.yaml"
    if not os.path.exists(quota_path):
        os.makedirs("finops", exist_ok=True)
        with open(quota_path, 'w') as f:
            yaml.dump({
                "default": {"budget": 1000},
                "tenant-a": {"budget": 2000},
                "tenant-b": {"budget": 1000}
            }, f)

    guard = CostGuard(quota_path)
    guard.check_budgets()
    guard.kill_slow_queries()
