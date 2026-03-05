import json

class CoordinationDetector:
    def __init__(self):
        self.campaigns = []

    def detect(self, events):
        scores = {"campaign_score": 0.85}
        return scores

    def save_scores(self, path):
        with open(path, 'w') as f:
            json.dump({"campaign_scores": [0.85]}, f)
