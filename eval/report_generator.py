import glob
import json
import os


def generate_html_report(latest_report_path, previous_report_path=None):
    with open(latest_report_path) as f:
        latest_results = json.load(f)

    previous_results = {}
    if previous_report_path and os.path.exists(previous_report_path):
        with open(previous_report_path) as f:
            previous_results = {(item["task"], item["model"]): item for item in json.load(f)}

    html_content = (
        """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Maestro Evaluation Report</title>
        <style>
            body { font-family: sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .delta-up { color: green; }
            .delta-down { color: red; }
            .delta-neutral { color: gray; }
        </style>
    </head>
    <body>
        <h1>Maestro Evaluation Report</h1>
        <p>Generated: """
        + os.path.basename(latest_report_path)
        + """</p>
    """
    )

    for item in latest_results:
        task_model_key = (item["task"], item["model"])
        prev_item = previous_results.get(task_model_key, {})

        html_content += f"<h2>Task: {item['task']} - Model: {item['model']}</h2>"
        html_content += "<table>"
        html_content += "<tr><th>Metric</th><th>Latest</th><th>Previous</th><th>Delta</th></tr>"

        metrics = ["mean_score", "p95_latency_ms", "mean_cost_per_item_usd", "error_rate"]
        for metric in metrics:
            latest_val = item.get(metric, "N/A")
            prev_val = prev_item.get(metric, "N/A")
            delta_class = "delta-neutral"
            delta_val = ""

            if isinstance(latest_val, (int, float)) and isinstance(prev_val, (int, float)):
                delta = latest_val - prev_val
                if metric == "mean_score":  # Higher is better
                    delta_class = (
                        "delta-up"
                        if delta > 0
                        else ("delta-down" if delta < 0 else "delta-neutral")
                    )
                else:  # Lower is better for latency, cost, error_rate
                    delta_class = (
                        "delta-down"
                        if delta < 0
                        else ("delta-up" if delta > 0 else "delta-neutral")
                    )
                delta_val = f" ({'+' if delta > 0 else ''}{delta:.4f})"

            html_content += f"<tr><td>{metric}</td><td>{latest_val:.4f}</td><td>{prev_val:.4f}</td><td class='{delta_class}'>{delta_val}</td></tr>"
        html_content += "</table>"

    html_content += """
    </body>
    </html>
    """

    report_dir = os.path.dirname(latest_report_path)
    html_filename = os.path.join(
        report_dir, os.path.basename(latest_report_path).replace(".json", ".html")
    )
    with open(html_filename, "w") as f:
        f.write(html_content)
    print(f"Generated HTML report: {html_filename}")


if __name__ == "__main__":
    # Find the latest report.json
    reports_dir = "reports"
    list_of_files = glob.glob(os.path.join(reports_dir, "report-*.json"))
    if not list_of_files:
        print("No reports found to generate HTML summary.")
    else:
        latest_report = max(list_of_files, key=os.path.getctime)

        # Find the second latest report for comparison
        list_of_files.remove(latest_report)
        previous_report = None
        if list_of_files:
            previous_report = max(list_of_files, key=os.path.getctime)

        generate_html_report(latest_report, previous_report)
