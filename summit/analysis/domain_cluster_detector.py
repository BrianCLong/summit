class DomainClusterDetector:
    def __init__(self):
        pass

    def detect_farms(self, domains):
        return [{"cluster_id": "pravda-style", "domains": domains}]
