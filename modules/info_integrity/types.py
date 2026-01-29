from dataclasses import dataclass
from typing import Literal

SentimentBucket = Literal["neg", "neu", "pos", "mixed", "unknown"]

@dataclass(frozen=True)
class AggregateSignals:
    region_bucket: str
    time_bucket: str
    topic: str
    sentiment_bucket: SentimentBucket
    volume_estimate: int
