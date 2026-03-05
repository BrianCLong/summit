from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, field

@dataclass
class Moment:
    id: str
    timestamp: datetime
    source_app: str
    uri: str
    title: str
    text: str
    content_hash: str
    metadata: Dict[str, str] = field(default_factory=dict)
    sensitivity_tags: List[str] = field(default_factory=list)
