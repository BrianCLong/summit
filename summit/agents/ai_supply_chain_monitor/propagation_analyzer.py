class Package:
    def __init__(self, name, age_days, trust_score, ai_recommendations=0):
        self.name = name
        self.age_days = age_days
        self.trust_score = trust_score
        self.ai_recommendations = ai_recommendations

class PropagationAnalyzer:
    def __init__(self, recommendation_threshold=10000, age_threshold=7, minimum_trust_score=0.5):
        self.recommendation_threshold = recommendation_threshold
        self.age_threshold = age_threshold
        self.minimum_trust_score = minimum_trust_score

    def detect_autonomous_propagation(self, package):
        """
        Detect if a package is showing signs of autonomous malware propagation
        driven by AI recommendations.
        """
        if (package.ai_recommendations > self.recommendation_threshold and
            package.age_days < self.age_threshold and
            package.trust_score < self.minimum_trust_score):
            return True
        return False
