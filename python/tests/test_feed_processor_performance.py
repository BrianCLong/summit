import os
import sys
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from feed_processor import ThroughputTracker


def test_throughput_tracker_windowing() -> None:
    tracker = ThroughputTracker(window_seconds=5)
    now = time.time()
    tracker.track(1, timestamp=now - 10)
    tracker.track(2, timestamp=now - 4)
    tracker.track(3, timestamp=now - 1)

    eps = tracker.events_per_second()
    assert eps > 0
    # Ensure old events were evicted
    tracker.track(4, timestamp=now)
    assert tracker.events_per_second() >= eps
