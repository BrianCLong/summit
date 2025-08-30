from __future__ import annotations

from transformers import pipeline


class LLMGraphSentimentModel:
    """Wrapper around a HuggingFace sentiment pipeline.

    The model exposes a simple ``analyze`` coroutine that returns a sentiment
    label, confidence score and an influence map for neighbouring entities. The
    influence map is a naive distribution that shares the model's confidence
    equally across neighbours; this is sufficient for unit testing and can be
    replaced with a learned GNN in the future.
    """

    def __init__(self, model_name: str = "distilbert-base-uncased-finetuned-sst-2-english") -> None:
        # The pipeline loads lazily and caches the model on first use which keeps
        # tests reasonably fast while still exercising the transformers API.
        self._pipe = pipeline("sentiment-analysis", model=model_name)

    async def analyze(self, text: str, neighbours: list[str] | None = None) -> dict[str, object]:
        result = self._pipe(text)[0]
        label = result["label"].lower()
        score = float(result["score"])

        # Distribute confidence equally across neighbours if provided.
        influence: dict[str, float] = {}
        if neighbours:
            weight = score / len(neighbours)
            influence = {n: weight for n in neighbours}

        return {"sentiment": label, "score": score, "influence_map": influence}
