from modules.signals.models import EventSignal

ACTIONABLE_REASONS = {
    "CrashLoopBackOff": "workload_crash_loop",
    "FailedScheduling": "scheduler_failed",
    "Unhealthy": "probe_failed"
}

def classify_event(e: EventSignal) -> str | None:
    # Map known reasons to normalized operational signals.
    return ACTIONABLE_REASONS.get(e.reason)
