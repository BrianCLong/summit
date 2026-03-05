from summit.influence.hybrid_correlation import correlate_events


def test_hybrid_correlation():
    sabotage_events = [{'id': 's1', 'timestamp': 1000}]
    info_events = [
        {'id': 'i1', 'timestamp': 1050},
        {'id': 'i2', 'timestamp': 100000}
    ]
    correlations = correlate_events(sabotage_events, info_events, time_window_hours=1)
    assert len(correlations) == 1
    assert correlations[0]['sabotage_event'] == 's1'
    assert 'i1' in correlations[0]['related_info_events']
    assert 'i2' not in correlations[0]['related_info_events']
