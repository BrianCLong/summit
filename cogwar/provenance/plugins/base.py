class ForensicsPlugin:
    name = "base"

    def score(self, artifact_bytes: bytes) -> dict:
        """Return {'risk':0..1,'signals':{...}}. No content generation."""
        return {"risk": 0.0, "signals": {}}
