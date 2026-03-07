import json
import os

def calculate_metrics(forecast_results):
    if not forecast_results:
        return {"average_divergence": 0.0, "calibration_error": 0.0}

    total_divergence = sum(r.get('divergence_score', 0) for r in forecast_results)
    avg_divergence = total_divergence / len(forecast_results)

    # Mock calibration error
    calibration_error = avg_divergence * 0.5

    return {
        "average_divergence": avg_divergence,
        "calibration_error": calibration_error
    }

def save_metrics(metrics, output_dir="artifacts/behavior-forecasting"):
    os.makedirs(output_dir, exist_ok=True)
    with open(f"{output_dir}/metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

if __name__ == "__main__":
    # Example usage / generation of dummy metrics
    mock_results = [{"divergence_score": 0.1}, {"divergence_score": 0.2}]
    metrics = calculate_metrics(mock_results)
    save_metrics(metrics)
    print(f"Metrics saved: {metrics}")
