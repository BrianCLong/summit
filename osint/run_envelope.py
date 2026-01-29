from dataclasses import dataclass
from pathlib import Path
import json

@dataclass(frozen=True)
class RunEnvelope:
    run_id: str
    out_dir: Path

def write_stamp(envelope: RunEnvelope, started_at_iso: str, finished_at_iso: str) -> None:
    envelope.out_dir.mkdir(parents=True, exist_ok=True)
    (envelope.out_dir / "stamp.json").write_text(json.dumps({
        "run_id": envelope.run_id,
        "started_at": started_at_iso,
        "finished_at": finished_at_iso
    }, indent=2, sort_keys=True))
