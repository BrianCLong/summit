from analysis.domain_cluster_detector import detect_clusters


def test_domain_cluster_detector():
    domains = [
        {'name': 'd1', 'hosting': 'h1'},
        {'name': 'd2', 'hosting': 'h1'},
        {'name': 'd3', 'hosting': 'h2'},
    ]
    clusters = detect_clusters(domains)
    assert len(clusters) == 1
    assert set(clusters[0]) == set(['d1', 'd2'])
