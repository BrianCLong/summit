import json
from typing import Dict, Any

def generate_html_report(report: Dict[str, Any]) -> str:
    """
    Generates a simple HTML report from the JSON report.
    """
    status = report.get("drift_result", {}).get("status", "UNKNOWN")
    color = "green" if status == "OK" else "red"

    html = f"""
    <html>
    <head>
        <title>Graph Validator Report</title>
        <style>
            body {{ font-family: sans-serif; margin: 20px; }}
            .status {{ font-weight: bold; color: {color}; }}
            .metric {{ margin: 10px 0; }}
            pre {{ background: #f0f0f0; padding: 10px; }}
        </style>
    </head>
    <body>
        <h1>Graph Drift Report</h1>
        <div class="metric">Status: <span class="status">{status}</span></div>
        <div class="metric">Run ID: {report.get("run_id")}</div>

        <h2>Drift Metrics</h2>
        <div class="metric">KS Distance: {report.get("drift_result", {}).get("d"):.4f}</div>
        <div class="metric">P-Value: {report.get("drift_result", {}).get("p_value"):.4e}</div>

        <h2>Thresholds</h2>
        <div>Distance Threshold: {report.get("drift_result", {}).get("threshold_d")}</div>
        <div>P-Value Threshold: {report.get("drift_result", {}).get("threshold_p")}</div>

        <h2>Metadata</h2>
        <pre>{json.dumps(report.get("metadata", {}), indent=2)}</pre>
    </body>
    </html>
    """
    return html
