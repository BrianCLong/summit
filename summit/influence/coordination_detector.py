def detect_coordination(events, threshold=3):
    """
    Detects synchronized narrative bursts across accounts.
    """
    bursts = {}
    for event in events:
        if event['narrative'] not in bursts:
            bursts[event['narrative']] = []
        bursts[event['narrative']].append(event)

    campaigns = []
    for narrative, burst_events in bursts.items():
        if len(burst_events) >= threshold:
            campaigns.append({
                'narrative': narrative,
                'score': len(burst_events) / threshold
            })
    return campaigns
