# scripts/verify_subsumption.py
import sys
import os

# Add repo root to path
sys.path.append(os.getcwd())

print("Verifying imports...")
try:
    from summit.agents.patterns.planner import Planner
    from summit.agents.patterns.executor import Executor
    from summit.agents.patterns.judge import evaluate
    from summit.agents.patterns.watchdog import Watchdog
    from summit.orchestration.rollback import rollback_on_failure
    from summit.obs.metrics import Metrics
    from summit.agents.sentries.freshness import check_freshness
    from summit.agents.sentries.schema_drift import check_drift
    from summit.orchestration.queue import OfflineQueue
    from summit.orchestration.sync import SyncManager
    from connectors.cloud.oci import OCIConnector
    print("All imports successful.")
except Exception as e:
    print(f"Import failed: {e}")
    sys.exit(1)

print("Subsumption verification passed.")
