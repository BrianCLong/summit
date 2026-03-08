import os
import sys
import time
from typing import Any

# Add root directory to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Enable console exporters
os.environ["OTEL_CONSOLE_EXPORTER"] = "true"
os.environ["NODE_ENV"] = "test"

from summit.scouts.base import Config, Result, Scout
from summit.telemetry.instrumentation import get_telemetry
from summit.telemetry.logging import configure_logging

# Configure logging
configure_logging()

class MockScout(Scout):
    def name(self) -> str:
        return "mock_scout"

    def _run(self, ctx: Any, cfg: Config) -> Result:
        print("MockScout executing...")
        time.sleep(0.1) # Simulate work
        return Result(cost_ms=50)

def main():
    print("Initializing Telemetry...")
    telemetry = get_telemetry()
    telemetry.initialize()

    print("Running MockScout...")
    scout = MockScout()
    try:
        scout.run(None, Config())
        print("MockScout finished successfully.")
    except Exception as e:
        print(f"MockScout failed: {e}")

if __name__ == "__main__":
    from typing import Any  # Import here to avoid issues if not at top
    main()
