from __future__ import annotations

from typing import TypedDict, List, Literal, Optional

class DatasetMetadata(TypedDict):
    domain: str
    time_anchored: bool

class DeepSearchQAItem(TypedDict):
    id: str
    prompt: str
    answer_type: Literal["single", "set"]
    ground_truth: List[str]
    metadata: Optional[DatasetMetadata]
