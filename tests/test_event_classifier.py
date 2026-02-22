import pytest

from modules.events.classifier import classify_event
from modules.signals.models import EventSignal


def test_classify_known_event():
    event = EventSignal(
        cluster_id="c1",
        namespace="default",
        kind="Pod",
        reason="CrashLoopBackOff",
        message="Back-off restarting failed container",
        ts_unix=1234567890,
        labels={}
    )
    signal = classify_event(event)
    assert signal == "workload_crash_loop"

def test_classify_unknown_event():
    event = EventSignal(
        cluster_id="c1",
        namespace="default",
        kind="Pod",
        reason="UnknownReason",
        message="Something happened",
        ts_unix=1234567890,
        labels={}
    )
    signal = classify_event(event)
    assert signal is None
