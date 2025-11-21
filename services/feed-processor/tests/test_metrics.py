from feed_processor.metrics import ThroughputTracker


def test_throughput_tracker_snapshot():
    tracker = ThroughputTracker(window=5)
    tracker.record(100, 0.5, 0.0)
    tracker.record(80, 0.4, 1.0)
    snapshot = tracker.snapshot()

    assert snapshot["records_total"] == 180.0
    assert snapshot["batches_total"] == 2.0
    assert snapshot["throughput_avg_overall"] == 180.0 / 0.9
    assert snapshot["throughput_peak_window"] >= snapshot["throughput_avg_window"]
