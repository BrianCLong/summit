from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional


@dataclass
class Moment:
    id: str
    timestamp: datetime
    source_app: str
    uri: str
    title: str
    text: str
    content_hash: str
    metadata: dict[str, str] = field(default_factory=dict)
    sensitivity_tags: list[str] = field(default_factory=list)
