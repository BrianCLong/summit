import math
from typing import Dict, List, Any, Optional

class LogBinSketch:
    """
    A deterministic log-binned histogram sketch for degree distributions.
    Bins are defined by floor(log_base(degree)).
    """
    def __init__(self, base: float = 1.1):
        self.base = base
        self.counts: Dict[int, int] = {}
        self.n = 0
        self.min_degree = float('inf')
        self.max_degree = float('-inf')

    def add(self, degree: int):
        if degree < 0:
            return  # Ignore negative degrees
        self.n += 1
        self.min_degree = min(self.min_degree, degree)
        self.max_degree = max(self.max_degree, degree)

        if degree == 0:
            bin_idx = -1 # Special bin for 0
        else:
            bin_idx = int(math.floor(math.log(degree, self.base)))

        self.counts[bin_idx] = self.counts.get(bin_idx, 0) + 1

    def merge(self, other: 'LogBinSketch'):
        if abs(self.base - other.base) > 1e-9:
            raise ValueError("Cannot merge sketches with different bases")

        self.n += other.n
        if other.n > 0:
            self.min_degree = min(self.min_degree, other.min_degree)
            self.max_degree = max(self.max_degree, other.max_degree)

        for bin_idx, count in other.counts.items():
            self.counts[bin_idx] = self.counts.get(bin_idx, 0) + count

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "log_bin_histogram",
            "base": self.base,
            "n": self.n,
            "min": self.min_degree if self.n > 0 else None,
            "max": self.max_degree if self.n > 0 else None,
            "counts": self.counts
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'LogBinSketch':
        sketch = cls(base=data["base"])
        sketch.n = data["n"]
        sketch.min_degree = data.get("min", float('inf'))
        sketch.max_degree = data.get("max", float('-inf'))
        if sketch.min_degree is None: sketch.min_degree = float('inf')
        if sketch.max_degree is None: sketch.max_degree = float('-inf')

        # Convert string keys back to int if JSON serialized them as strings
        sketch.counts = {int(k): v for k, v in data["counts"].items()}
        return sketch

    def get_cdf(self) -> List[tuple[float, float]]:
        """Returns approximate CDF as (value, probability) pairs."""
        if self.n == 0:
            return []

        sorted_bins = sorted(self.counts.keys())
        cdf = []
        cumulative = 0

        for bin_idx in sorted_bins:
            cumulative += self.counts[bin_idx]
            # Use upper bound of bin for CDF value
            if bin_idx == -1:
                val = 0.0
            else:
                val = self.base ** (bin_idx + 1)

            cdf.append((val, cumulative / self.n))

        return cdf
