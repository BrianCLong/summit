from __future__ import annotations

import json
from pathlib import Path

from runtime.spar.types import RunRecord


class ArtifactMonitor:
    def __init__(self, artifact_dir: str = 'artifacts/spar') -> None:
        self.artifact_dir = Path(artifact_dir)

    def write(self, record: RunRecord) -> dict[str, str]:
        self.artifact_dir.mkdir(parents=True, exist_ok=True)

        run_path = self.artifact_dir / 'run.json'
        metrics_path = self.artifact_dir / 'metrics.json'
        stamp_path = self.artifact_dir / 'stamp.json'

        run_payload = record.to_dict()
        run_path.write_text(json.dumps(run_payload, indent=2), encoding='utf-8')

        metrics_payload = {
            'run_id': record.run_id,
            'task_count': len(record.tasks),
            'completed_count': sum(1 for result in record.results if result.status == 'completed'),
            'total_duration_ms': record.total_duration_ms,
        }
        metrics_path.write_text(json.dumps(metrics_payload, indent=2), encoding='utf-8')

        stamp_payload = {'schema': 'spar.v1', 'status': 'ready'}
        stamp_path.write_text(json.dumps(stamp_payload, indent=2), encoding='utf-8')

        return {
            'run': str(run_path),
            'metrics': str(metrics_path),
            'stamp': str(stamp_path),
        }
