from intelgraph_py.analytics.time_series_clustering import (
    cluster_event_timelines,
    combine_summaries_and_forecasts,
)


def test_cluster_event_timelines():
    summaries = {
        "A": {"summary": "Event A", "timeline": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]},
        "B": {"summary": "Event B", "timeline": [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]},
        "C": {"summary": "Event C", "timeline": [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]},
    }
    forecasts = {
        "A": [11, 12],
        "B": [12, 13],
        "C": [0, -1],
    }
    combined = combine_summaries_and_forecasts(summaries, forecasts)
    clusters = cluster_event_timelines(combined, window_size=3, min_cluster_size=2)

    cluster_with_two = next(
        (evs for evs in clusters.values() if set(["A", "B"]).issubset(set(evs))),
        None,
    )
    assert cluster_with_two is not None
