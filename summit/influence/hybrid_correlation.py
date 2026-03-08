def correlate_events(sabotage_events, info_events, time_window_hours=24):
    """
    Correlate sabotage events with narrative spikes.
    """
    correlations = []

    for sabotage in sabotage_events:
        related_info = []
        for info in info_events:
            time_diff = abs(info['timestamp'] - sabotage['timestamp'])
            if time_diff <= time_window_hours * 3600:
                related_info.append(info)

        if related_info:
            correlations.append({
                'sabotage_event': sabotage['id'],
                'related_info_events': [i['id'] for i in related_info],
                'correlation_score': len(related_info)
            })

    return correlations
