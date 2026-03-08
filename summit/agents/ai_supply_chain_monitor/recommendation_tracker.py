class RecommendationTracker:
    def __init__(self):
        self.recommendations = {}

    def track_recommendation(self, package_name, model, prompt_context):
        if package_name not in self.recommendations:
            self.recommendations[package_name] = {
                "count": 0,
                "models": set(),
                "contexts": []
            }

        self.recommendations[package_name]["count"] += 1
        self.recommendations[package_name]["models"].add(model)
        self.recommendations[package_name]["contexts"].append(prompt_context)

    def get_recommendation_count(self, package_name):
        return self.recommendations.get(package_name, {}).get("count", 0)
