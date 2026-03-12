import json
import os
import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path

FIXTURE_PATH = "evals/fixtures/confidence-calibration/test_set.json"
REPORT_PATH = "evals/confidence-calibration/report.json"
PLOT_PATH = "evals/confidence-calibration/calibration_curve.png"

def evaluate_calibration(num_bins=10):
    with open(FIXTURE_PATH, "r") as f:
        data = json.load(f)

    confidences = [item["confidence_score"] for item in data]
    accuracies = [1 if item["is_correct"] else 0 for item in data]

    confidences = np.array(confidences)
    accuracies = np.array(accuracies)

    bin_boundaries = np.linspace(0, 1, num_bins + 1)

    bin_accs = []
    bin_confs = []
    bin_sizes = []

    ece = 0.0
    mce = 0.0

    n = len(confidences)

    for i in range(num_bins):
        lower = bin_boundaries[i]
        upper = bin_boundaries[i+1]

        # Include upper boundary in the last bin
        if i == num_bins - 1:
            in_bin = (confidences >= lower) & (confidences <= upper)
        else:
            in_bin = (confidences >= lower) & (confidences < upper)

        bin_size = np.sum(in_bin)

        if bin_size > 0:
            bin_acc = np.mean(accuracies[in_bin])
            bin_conf = np.mean(confidences[in_bin])

            bin_accs.append(bin_acc)
            bin_confs.append(bin_conf)
            bin_sizes.append(int(bin_size))

            abs_diff = abs(bin_acc - bin_conf)

            ece += (bin_size / n) * abs_diff
            mce = max(mce, abs_diff)
        else:
            bin_accs.append(0.0)
            bin_confs.append(0.0)
            bin_sizes.append(0)

    # Determine systematic pattern
    overall_conf = np.mean(confidences)
    overall_acc = np.mean(accuracies)
    diff = overall_conf - overall_acc
    if diff > 0.05:
        pattern = "Systematically overconfident"
    elif diff < -0.05:
        pattern = "Systematically underconfident"
    else:
        pattern = "Well-calibrated"

    report = {
        "metrics": {
            "expected_calibration_error": ece,
            "maximum_calibration_error": mce,
            "overall_confidence": overall_conf,
            "overall_accuracy": overall_acc,
            "systematic_pattern": pattern
        },
        "bins": []
    }

    for i in range(num_bins):
        report["bins"].append({
            "bin_range": f"{bin_boundaries[i]:.2f}-{bin_boundaries[i+1]:.2f}",
            "bin_size": bin_sizes[i],
            "average_confidence": bin_confs[i],
            "average_accuracy": bin_accs[i]
        })

    with open(REPORT_PATH, "w") as f:
        json.dump(report, f, indent=2)

    print(f"Report saved to {REPORT_PATH}")
    print(f"Expected Calibration Error (ECE): {ece:.4f}")
    print(f"Maximum Calibration Error (MCE): {mce:.4f}")
    print(f"Pattern: {pattern}")

    # Plot
    plt.figure(figsize=(8, 8))
    plt.plot([0, 1], [0, 1], 'k--', label='Perfectly Calibrated')

    # Filter out empty bins for plotting
    plot_confs = [bin_confs[i] for i in range(num_bins) if bin_sizes[i] > 0]
    plot_accs = [bin_accs[i] for i in range(num_bins) if bin_sizes[i] > 0]

    plt.plot(plot_confs, plot_accs, 's-', label='Model Calibration')

    plt.xlabel('Confidence')
    plt.ylabel('Accuracy')
    plt.title('Reliability Diagram (Calibration Curve)')
    plt.legend()
    plt.grid(True, linestyle='--', alpha=0.7)

    plt.savefig(PLOT_PATH)
    print(f"Calibration curve saved to {PLOT_PATH}")

if __name__ == "__main__":
    evaluate_calibration()
