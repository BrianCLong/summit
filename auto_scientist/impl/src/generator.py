import random


class Generator:
    def __init__(self):
        self.topics = [
            "Use graphene for water filtration",
            "Use CRISPR to edit gene X",
            "Synthesize novel compound Y",
            "Deploy nanobots for drug delivery",
            "Create a pathogen for research",  # Intentionally unsafe
        ]

    def generate(self, topic: str) -> str:
        # Mock generation
        base = random.choice(self.topics)
        return f"Hypothesis: {base} related to {topic}"

    def refine(self, hypothesis: str, critique: str) -> str:
        return f"Refined {hypothesis} (Critique: {critique})"
