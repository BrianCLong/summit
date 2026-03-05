class SignalLedger:
    def __init__(self):
        self.signals = []

    def add_signal(self, asset_id: str, signal_type: str, weight: float):
        self.signals.append({"asset_id": asset_id, "type": signal_type, "weight": weight})

    def export(self):
        return sorted(self.signals, key=lambda x: (x["asset_id"], x["type"]))
