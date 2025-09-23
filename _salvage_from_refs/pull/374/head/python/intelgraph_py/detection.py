from typing import Dict, Optional


def detect_changes(prev: Optional[Dict], curr: Dict, thresholds: Dict) -> Dict:
  """Compare previous and current metrics and return anomalies."""
  anomalies: Dict[str, float] = {}
  if prev:
    node_drift = abs(curr.get("nodes", 0) - prev.get("nodes", 0)) / max(prev.get("nodes", 1), 1)
    if node_drift > thresholds.get("node_drift", 0.1):
      anomalies["nodes"] = node_drift
    edge_drift = abs(curr.get("edges", 0) - prev.get("edges", 0)) / max(prev.get("edges", 1), 1)
    if edge_drift > thresholds.get("edge_drift", 0.1):
      anomalies["edges"] = edge_drift
    if abs(curr.get("clusters", 0) - prev.get("clusters", 0)) > thresholds.get("cluster_shift", 1):
      anomalies["clusters"] = curr.get("clusters", 0) - prev.get("clusters", 0)
  if curr.get("metric_score", 0) > thresholds.get("metric_score", 1.0):
    anomalies["metric_score"] = curr.get("metric_score", 0)
  return anomalies
