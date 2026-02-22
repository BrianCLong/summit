class PolicyEngine:
    def __init__(self, config):
        self.config = config

    def evaluate(self, current_metrics, baseline_metrics):
        """
        current_metrics: dict with mean_deg, skew_deg, top1p_mass
        baseline_metrics: list of dicts with mean_deg, skew_deg, top1p_mass
        """
        if not baseline_metrics:
            return True, "No baseline data available. Passing by default.", {}

        # Compute baseline means
        baseline_skew_mean = sum(m['skew_deg'] for m in baseline_metrics) / len(baseline_metrics)
        baseline_top1p_mean = sum(m['top1p_mass'] for m in baseline_metrics) / len(baseline_metrics)

        delta_skew = abs(current_metrics['skew_deg'] - baseline_skew_mean)
        delta_top1p = current_metrics['top1p_mass'] - baseline_top1p_mean # percentage points

        # Thresholds from config or defaults
        # 0.5 for skewness, 5 percentage points (0.05) for top 1% mass
        skew_threshold = self.config.get('skew_threshold', 0.5)
        top1p_threshold = self.config.get('top1p_threshold', 0.05)

        failures = []
        if delta_skew > skew_threshold:
            failures.append(f"|Δskew| ({delta_skew:.3f}) > {skew_threshold}")
        if delta_top1p > top1p_threshold:
            failures.append(f"Δ(top1%_mass) ({delta_top1p:.3f}) > {top1p_threshold}")

        report_data = {
            "baseline_skew_mean": baseline_skew_mean,
            "baseline_top1p_mean": baseline_top1p_mean,
            "delta_skew": delta_skew,
            "delta_top1p": delta_top1p,
            "skew_threshold": skew_threshold,
            "top1p_threshold": top1p_threshold
        }

        if failures:
            return False, "Alert: " + " OR ".join(failures), report_data
        return True, "Pass: metrics within thresholds.", report_data
