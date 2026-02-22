from .sketch import LogBinSketch
from .ks import ks_distance, ks_p_value_approx

class DriftResult:
    def __init__(self, d: float, p_value: float, status: str, threshold_d: float, threshold_p: float):
        self.d = d
        self.p_value = p_value
        self.status = status
        self.threshold_d = threshold_d
        self.threshold_p = threshold_p

    def to_dict(self):
        return {
            "d": self.d,
            "p_value": self.p_value,
            "status": self.status,
            "threshold_d": self.threshold_d,
            "threshold_p": self.threshold_p
        }

class DriftDetector:
    def __init__(self, threshold_d: float = 0.05, threshold_p: float = 0.01):
        self.threshold_d = threshold_d
        self.threshold_p = threshold_p

    def check(self, baseline: LogBinSketch, window: LogBinSketch) -> DriftResult:
        d = ks_distance(baseline, window)
        p = ks_p_value_approx(d, baseline.n, window.n)

        status = "OK"
        # Drift if D is high OR p-value is low (statistically significant difference)
        if d > self.threshold_d:
            status = "DRIFT"
        elif p < self.threshold_p:
            status = "DRIFT"

        return DriftResult(d, p, status, self.threshold_d, self.threshold_p)
