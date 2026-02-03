import hashlib
import json
from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class Finding:
    rule_id: str
    severity: str  # 'info', 'warn', 'fail'
    message: str
    path: Optional[str] = None
    line: Optional[int] = None

    def to_dict(self):
        return {
            "rule_id": self.rule_id,
            "severity": self.severity,
            "message": self.message,
            "path": self.path,
            "line": self.line
        }

    @property
    def evidence_id(self):
        # Stable hash for evidence ID
        content = f"{self.rule_id}:{self.message}:{self.path}:{self.line}"
        h = hashlib.sha256(content.encode()).hexdigest()[:12]
        return f"SOLID_GATE:{self.rule_id}:{h}"

@dataclass
class Report:
    findings: list[Finding] = field(default_factory=list)

    def to_dict(self):
        return {
            "findings": [
                {**f.to_dict(), "evidence_id": f.evidence_id}
                for f in sorted(self.findings, key=lambda x: x.evidence_id)
            ]
        }

@dataclass
class Metrics:
    counts: dict[str, int] = field(default_factory=dict)

    @classmethod
    def from_report(cls, report: Report):
        counts = {}
        for f in report.findings:
            key = f"SOLID_GATE:{f.severity.upper()}"
            counts[key] = counts.get(key, 0) + 1
            rule_key = f"SOLID_GATE:RULE:{f.rule_id}"
            counts[rule_key] = counts.get(rule_key, 0) + 1
        return cls(counts=counts)

    def to_dict(self):
        return self.counts

@dataclass
class Stamp:
    tool_version: str
    config_hash: str
    commit_sha: str
    diff_base: str

    def to_dict(self):
        return {
            "tool_version": self.tool_version,
            "config_hash": self.config_hash,
            "commit_sha": self.commit_sha,
            "diff_base": self.diff_base
        }
