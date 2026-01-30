from collections import Counter

from .base import Event


def burst_counts(events):
    # bucket by minute (floor)
    c = Counter()
    for e in events:
        c[e.ts_ms // 60000] += 1
    return dict(c)
