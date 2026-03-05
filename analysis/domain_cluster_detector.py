def detect_clusters(domains):
    """
    Detects content farm networks.
    """
    clusters = []
    for d1 in domains:
        cluster = [d1['name']]
        for d2 in domains:
            if d1['name'] == d2['name']:
                continue
            if d1.get('hosting') == d2.get('hosting') or d1.get('cross_citation_score', 0) > 0.8:
                cluster.append(d2['name'])
        if len(cluster) > 1 and set(cluster) not in [set(c) for c in clusters]:
            clusters.append(cluster)
    return clusters
