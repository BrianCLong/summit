from summit.analysis.domain_cluster_detector import DomainClusterDetector


def test_domain_network():
    detector = DomainClusterDetector()
    farms = detector.detect_farms(["fake-news.com", "fake-news.net"])
    assert len(farms) == 1
    assert "fake-news.com" in farms[0]["domains"]
