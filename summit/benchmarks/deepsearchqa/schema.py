from __future__ import annotations

from typing import List, Literal, Optional, TypedDict


class DatasetMetadata(TypedDict):
    domain: str
    time_anchored: bool

class DeepSearchQAItem(TypedDict):
    id: str
    prompt: str
    answer_type: Literal["single", "set"]
    ground_truth: list[str]
    metadata: Optional[DatasetMetadata]
