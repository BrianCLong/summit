# Entity Resolution Module

Hybrid entity resolution pipeline combining phonetic blocking, fuzzy and embedding based scoring.

## Components

- **Candidate generation**: Double Metaphone with first-letter blocking.
- **Scoring**: Jaro-Winkler similarity and TF-IDF cosine similarity.
- **Thresholding**: automatic calibration over labelled pairs.

## Usage

```
from ml.er import ERPipeline
pipeline = ERPipeline()
pipeline.fit({"1": "Jon Smith", "2": "John Smith"})
threshold, f1 = pipeline.calibrate_threshold([("1","2",1)])
results = pipeline.resolve()
```

## Tuning

- `threshold`: decision boundary after calibration.
- `EmbeddingMatcher` vectorizer n-gram range can be tweaked for domain specific data.
- Adjust feature weights in `score_pair` for different precision/recall trade offs.

## API

`ml/er/api.py` exposes a deterministic CLI returning JSON with version, score, match and feature attributions.
