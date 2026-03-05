from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class WorkflowResult:
    outputs: dict[str, Any]
    evid: str
    output_dir: str
