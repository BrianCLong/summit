from typing import Any, Dict, List


class SignalLedger:
    def __init__(self):
        self.signals = []

    def record_signal(self, actor_id: str, asset_id: str, signal_type: str, metadata: dict[str, Any]):
        self.signals.append({
            "actor_id": actor_id,
            "asset_id": asset_id,
            "type": signal_type,
            "metadata": metadata
        })

    def get_ledger(self) -> list[dict[str, Any]]:
        # Deterministic sort
        return sorted(self.signals, key=lambda x: f"{x['actor_id']}_{x['asset_id']}_{x['type']}")
