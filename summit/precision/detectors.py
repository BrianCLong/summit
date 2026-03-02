
try:
    import torch
    import torch.nn.functional as F
except ImportError:
    torch = None
    F = None

def detect_anomalies(data):
    if torch is None:
        print("Warning: torch not available, skipping anomaly detection")
        return []
    # ... existing logic ...
    return []
