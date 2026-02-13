from __future__ import annotations
from dataclasses import dataclass

@dataclass(frozen=True)
class SlideStats:
    words: int
    bullets: int
    has_figure: bool

def score_deck(slides: list[SlideStats]) -> dict:
    """
    Experimental heuristic inspired by 'smooth rhythm' notion in the ITEM.
    Default OFF in product.
    """
    if not slides:
        return {"score": 0, "reason": "empty"}
    densities = [s.words for s in slides]
    mean = sum(densities) / len(densities)
    var = sum((d-mean)**2 for d in densities) / len(densities)
    # Lower variance => smoother rhythm
    score = max(0.0, 100.0 - (var ** 0.5))
    return {
        "score": round(score, 2),
        "mean_words": round(mean, 1),
        "stdev_words": round(var ** 0.5, 1)
    }
