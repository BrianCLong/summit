from __future__ import annotations

import os
import platform
from dataclasses import dataclass
from datetime import UTC, datetime


@dataclass(frozen=True)
class StampInputs:
    evidence_id: str
    mapping_sha256: str
    seed: str
    mode: str
    code_sha: str


def build_stamp(inputs: StampInputs) -> dict[str, str]:
    return {
        'evidence_id': inputs.evidence_id,
        'mapping_sha256': inputs.mapping_sha256,
        'seed': inputs.seed,
        'mode': inputs.mode,
        'code_sha': inputs.code_sha,
        'python': platform.python_version(),
        'platform': platform.platform(),
        'generated_at': datetime.now(UTC).isoformat(),
        'runner': os.environ.get('GITHUB_RUN_ID', 'local'),
    }
