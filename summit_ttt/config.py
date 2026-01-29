from dataclasses import dataclass, field
from typing import Optional

@dataclass
class TTTConfig:
    env_id: str
    run_id: str
    max_attempts: int = 10
    dry_run: bool = True
    output_dir: str = "runs/latest"
