import json
from dataclasses import dataclass, field, asdict
from typing import List, Optional

@dataclass
class EvidenceItem:
    id: str
    text: str
    offset: int

@dataclass
class MethodStep:
    step_number: int
    description: str

@dataclass
class Method:
    id: str
    name: str
    steps: List[MethodStep]

@dataclass
class AssetBrief:
    title: str
    summary: str

@dataclass
class Report:
    moments: List[EvidenceItem]
    methods: List[Method]
    brief: AssetBrief
    version: str = '1.0.0'

    def to_dict(self):
        return asdict(self)

    def to_json(self, indent=None):
        return json.dumps(self.to_dict(), indent=indent)

@dataclass
class Metrics:
    input_tokens: int
    output_tokens: int
    redaction_count: int
    duration_ms: int

    def to_dict(self):
        return asdict(self)

    def to_json(self, indent=None):
        return json.dumps(self.to_dict(), indent=indent)

@dataclass
class Stamp:
    pipeline_version: str
    model_id: str
    corpus_hash: str

    def to_dict(self):
        return asdict(self)

    def to_json(self, indent=None):
        return json.dumps(self.to_dict(), indent=indent)
