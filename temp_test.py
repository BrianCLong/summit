import json
with open('evidence/index.json', 'r') as f:
    json.load(f)
print("JSON OK")

from summit.precision.detectors import compute_mismatch_metrics
print("Import OK")
