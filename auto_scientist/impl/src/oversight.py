class Oversight:
    def evaluate(self, hypothesis: str, policy: str):
        # Mock oversight: Reject if "pathogen" is in text
        if "pathogen" in hypothesis.lower():
            return 0.1, "Violates safety policy: Pathogen creation prohibited."
        return 0.9, "Approved."
