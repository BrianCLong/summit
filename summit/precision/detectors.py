try:
    import torch
except ImportError:
    torch = None

class MismatchReport:
    def __init__(self):
        self.violations = []
        self.max_abs_logprob_delta = 0.0
        self.mean_abs_logprob_delta = 0.0

def compute_mismatch_metrics(a, b):
    # Placeholder implementation that preserves interface
    return MismatchReport()
