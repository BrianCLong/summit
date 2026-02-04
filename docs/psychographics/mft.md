# Moral Foundations Theory (MFT) Scorer

This module provides scoring of text against the Moral Foundations Theory axes.

## Axes
*   Care / Harm
*   Fairness / Cheating
*   Loyalty / Betrayal
*   Authority / Subversion
*   Sanctity / Degradation
*   (Optional) Liberty / Oppression

## Usage
```python
from psychographics.mft.scorer import MFTScorer
scorer = MFTScorer()
score = scorer.score("I care about everyone.")
print(score.care_harm)
```

## Prompt Sensitivity
The scorer is designed to be aware of framing and prompt sensitivity. Future versions will support `context` to adjust scoring based on simulation framing.
