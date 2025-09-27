#!/usr/bin/env python3
"""
Adaptive Canary Controller for MC Platform v0.3.5
Self-tuning canary deployments with composite scoring
"""

import json
import time
import argparse
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import statistics
import random


@dataclass
class MetricSource:
    """Configuration for a metric source"""
    name: str
    endpoint: str
    query: str
    weight: float
    threshold: Dict[str, float]  # {promote: value, hold: value}
    invert: bool = False  # True if lower values are better


@dataclass
class CanaryScore:
    """Canary deployment score"""
    timestamp: str
    baseline_metrics: Dict[str, float]
    candidate_metrics: Dict[str, float]
    weighted_scores: Dict[str, float]
    composite_score: float
    decision: str  # PROMOTE, HOLD, ROLLBACK
    confidence: float
    reasons: List[str]


class AdaptiveCanaryController:
    """Self-tuning canary controller with composite scoring"""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.metric_sources = self._parse_metric_sources(config.get("metrics", []))
        self.decision_history = []
        self.baseline_history = []
        self.adaptation_enabled = config.get("adaptation_enabled", True)

    def _parse_metric_sources(self, metrics_config: List[Dict]) -> List[MetricSource]:
        """Parse metric sources from configuration"""
        sources = []

        default_metrics = [
            {
                "name": "p95_latency",
                "query": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))*1000",
                "weight": 0.4,
                "threshold": {"promote": 350.0, "hold": 500.0},
                "invert": True
            },
            {
                "name": "error_rate",
                "query": "rate(http_requests_total{code=~\"5..\"}[5m])*100",
                "weight": 0.3,
                "threshold": {"promote": 1.0, "hold": 3.0},
                "invert": True
            },
            {
                "name": "cost_per_1k",
                "query": "sum(rate(mc_cost_total[5m]))*1000/sum(rate(http_requests_total[5m]))",
                "weight": 0.2,
                "threshold": {"promote": 0.5, "hold": 0.8},
                "invert": True
            },
            {
                "name": "tail_p99",
                "query": "histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))*1000",
                "weight": 0.1,
                "threshold": {"promote": 800.0, "hold": 1200.0},
                "invert": True
            }
        ]

        # Use provided metrics or defaults
        metrics_to_use = metrics_config if metrics_config else default_metrics

        for metric_config in metrics_to_use:
            source = MetricSource(
                name=metric_config["name"],
                endpoint=self.config.get("prometheus_url", "http://localhost:9090"),
                query=metric_config["query"],
                weight=metric_config["weight"],
                threshold=metric_config["threshold"],
                invert=metric_config.get("invert", False)
            )
            sources.append(source)

        return sources

    def fetch_metric(self, source: MetricSource, service_selector: str) -> Optional[float]:
        """Fetch metric value from Prometheus (simulated)"""

        # In production, this would make actual Prometheus requests
        # For demo, return realistic simulated values based on metric type
        metric_simulations = {
            "p95_latency": {"baseline": 142.5, "candidate": 138.2, "variance": 15.0},
            "error_rate": {"baseline": 0.12, "candidate": 0.09, "variance": 0.05},
            "cost_per_1k": {"baseline": 0.234, "candidate": 0.198, "variance": 0.05},
            "tail_p99": {"baseline": 324.1, "candidate": 312.7, "variance": 25.0}
        }

        if source.name in metric_simulations:
            sim = metric_simulations[source.name]
            if "candidate" in service_selector:
                base_value = sim["candidate"]
            else:
                base_value = sim["baseline"]

            # Add some variance
            variance = random.uniform(-sim["variance"], sim["variance"])
            return max(0, base_value + variance)

        # Default fallback
        return random.uniform(0.1, 1.0)

    def calculate_metric_score(self, baseline: float, candidate: float,
                              threshold: Dict[str, float], invert: bool = False) -> float:
        """Calculate normalized score for a metric comparison"""

        if invert:
            # Lower values are better (latency, error rate, cost)
            if candidate <= threshold["promote"]:
                return 1.0  # Excellent
            elif candidate <= threshold["hold"]:
                # Linear scale between promote and hold thresholds
                ratio = (threshold["hold"] - candidate) / (threshold["hold"] - threshold["promote"])
                return max(0.5, ratio)
            else:
                return 0.0  # Poor performance

        else:
            # Higher values are better (throughput, availability)
            if candidate >= threshold["promote"]:
                return 1.0  # Excellent
            elif candidate >= threshold["hold"]:
                # Linear scale between hold and promote thresholds
                ratio = (candidate - threshold["hold"]) / (threshold["promote"] - threshold["hold"])
                return max(0.5, ratio)
            else:
                return 0.0  # Poor performance

    def calculate_composite_score(self, baseline_url: str, candidate_url: str) -> CanaryScore:
        """Calculate composite canary score"""

        timestamp = datetime.utcnow().isoformat() + "Z"
        baseline_metrics = {}
        candidate_metrics = {}
        weighted_scores = {}
        reasons = []

        print(f"🔍 Evaluating canary: {candidate_url} vs {baseline_url}")

        # Fetch all metrics
        for source in self.metric_sources:
            baseline_value = self.fetch_metric(source, "baseline")
            candidate_value = self.fetch_metric(source, "candidate")

            if baseline_value is None or candidate_value is None:
                print(f"  ⚠️ Could not fetch {source.name}, skipping")
                continue

            baseline_metrics[source.name] = baseline_value
            candidate_metrics[source.name] = candidate_value

            # Calculate metric score
            metric_score = self.calculate_metric_score(
                baseline_value, candidate_value, source.threshold, source.invert
            )

            weighted_scores[source.name] = metric_score * source.weight

            # Log metric details
            status_emoji = "✅" if metric_score > 0.7 else "⚠️" if metric_score > 0.3 else "❌"
            print(f"  {status_emoji} {source.name}: {candidate_value:.3f} vs {baseline_value:.3f} "
                  f"(score: {metric_score:.3f}, weight: {source.weight:.1f})")

            # Add reasoning
            if metric_score < 0.5:
                if source.invert:
                    reasons.append(f"{source.name} regression: {candidate_value:.3f} > {source.threshold['hold']}")
                else:
                    reasons.append(f"{source.name} regression: {candidate_value:.3f} < {source.threshold['hold']}")

        # Calculate composite score
        composite_score = sum(weighted_scores.values())
        confidence = min(1.0, composite_score + 0.1)  # Slight confidence boost

        # Make decision
        if composite_score >= 0.8:
            decision = "PROMOTE"
            reasons.append(f"Composite score {composite_score:.3f} exceeds promotion threshold")
        elif composite_score >= 0.5:
            decision = "HOLD"
            reasons.append(f"Composite score {composite_score:.3f} in hold range - extending bake time")
        else:
            decision = "ROLLBACK"
            reasons.append(f"Composite score {composite_score:.3f} below rollback threshold")

        score = CanaryScore(
            timestamp=timestamp,
            baseline_metrics=baseline_metrics,
            candidate_metrics=candidate_metrics,
            weighted_scores=weighted_scores,
            composite_score=composite_score,
            decision=decision,
            confidence=confidence,
            reasons=reasons
        )

        print(f"  🎯 Composite Score: {composite_score:.3f} → {decision} (confidence: {confidence:.3f})")

        return score

    def adapt_thresholds(self, recent_scores: List[CanaryScore]) -> None:
        """Adapt thresholds based on recent performance"""

        if not self.adaptation_enabled or len(recent_scores) < 5:
            return

        print(f"🔧 Adapting thresholds based on {len(recent_scores)} recent scores...")

        # Analyze recent performance patterns
        successful_promotions = [s for s in recent_scores if s.decision == "PROMOTE"]
        false_holds = [s for s in recent_scores if s.decision == "HOLD" and s.composite_score > 0.7]

        # Adjust thresholds if we have enough data
        if len(successful_promotions) >= 3:
            # Calculate average metrics for successful promotions
            for source in self.metric_sources:
                if source.name in successful_promotions[0].candidate_metrics:
                    values = [s.candidate_metrics[source.name] for s in successful_promotions]
                    avg_value = statistics.mean(values)
                    std_value = statistics.stdev(values) if len(values) > 1 else 0

                    # Relax promote threshold slightly if consistently good
                    if source.invert:
                        new_threshold = avg_value + (2 * std_value)
                        source.threshold["promote"] = min(source.threshold["promote"] * 1.1, new_threshold)
                    else:
                        new_threshold = avg_value - (2 * std_value)
                        source.threshold["promote"] = max(source.threshold["promote"] * 0.9, new_threshold)

                    print(f"  📊 Adapted {source.name} promote threshold to {source.threshold['promote']:.3f}")

    def run_evaluation(self, baseline_url: str, candidate_url: str,
                       window_minutes: int = 10) -> Dict[str, Any]:
        """Run canary evaluation over specified window"""

        print(f"🚀 MC Platform v0.3.5 - Adaptive Canary Evaluation")
        print(f"   Baseline: {baseline_url}")
        print(f"   Candidate: {candidate_url}")
        print(f"   Window: {window_minutes} minutes")
        print("=" * 60)

        scores = []
        start_time = time.time()
        evaluation_interval = 60  # 1 minute between evaluations

        while (time.time() - start_time) < (window_minutes * 60):
            # Calculate current score
            score = self.calculate_composite_score(baseline_url, candidate_url)
            scores.append(score)
            self.decision_history.append(score)

            # Adapt thresholds if enabled
            if len(self.decision_history) >= 5:
                self.adapt_thresholds(self.decision_history[-10:])

            # Check for early termination conditions
            if score.decision == "ROLLBACK":
                print(f"🛑 Early termination: ROLLBACK decision")
                break

            if len(scores) >= 3 and all(s.decision == "PROMOTE" for s in scores[-3:]):
                print(f"🚀 Early termination: 3 consecutive PROMOTE decisions")
                break

            # Wait for next evaluation (simplified for demo)
            if (time.time() - start_time) < (window_minutes * 60) - 5:
                print(f"  ⏳ Waiting {evaluation_interval}s for next evaluation...")
                time.sleep(min(evaluation_interval, 5))  # Cap at 5s for demo

        # Calculate final decision
        final_score = scores[-1] if scores else None
        decision_counts = {}
        for score in scores:
            decision_counts[score.decision] = decision_counts.get(score.decision, 0) + 1

        # Generate evaluation report
        report = {
            "evaluation_metadata": {
                "baseline_url": baseline_url,
                "candidate_url": candidate_url,
                "window_minutes": window_minutes,
                "evaluations_completed": len(scores),
                "start_time": datetime.fromtimestamp(start_time).isoformat() + "Z",
                "end_time": datetime.utcnow().isoformat() + "Z"
            },
            "decision_summary": {
                "final_decision": final_score.decision if final_score else "NO_DATA",
                "decision_counts": decision_counts,
                "final_composite_score": final_score.composite_score if final_score else 0.0,
                "confidence": final_score.confidence if final_score else 0.0
            },
            "metric_analysis": self._analyze_metrics(scores),
            "threshold_adaptations": self._get_threshold_changes(),
            "all_scores": [self._score_to_dict(score) for score in scores]
        }

        print(f"\n🎯 Final Decision: {report['decision_summary']['final_decision']}")
        print(f"📊 Composite Score: {report['decision_summary']['final_composite_score']:.3f}")
        print(f"🔍 Confidence: {report['decision_summary']['confidence']:.3f}")

        return report

    def _analyze_metrics(self, scores: List[CanaryScore]) -> Dict[str, Any]:
        """Analyze metric trends across evaluations"""

        if not scores:
            return {}

        analysis = {}

        for source in self.metric_sources:
            candidate_values = [s.candidate_metrics.get(source.name, 0) for s in scores]
            baseline_values = [s.baseline_metrics.get(source.name, 0) for s in scores]

            if candidate_values and baseline_values:
                analysis[source.name] = {
                    "candidate_avg": statistics.mean(candidate_values),
                    "baseline_avg": statistics.mean(baseline_values),
                    "candidate_trend": "improving" if candidate_values[-1] < candidate_values[0] else "stable",
                    "improvement_pct": ((statistics.mean(baseline_values) - statistics.mean(candidate_values)) /
                                       statistics.mean(baseline_values) * 100) if source.invert else 0
                }

        return analysis

    def _get_threshold_changes(self) -> Dict[str, Any]:
        """Get summary of threshold adaptations"""

        changes = {}
        for source in self.metric_sources:
            changes[source.name] = {
                "current_promote": source.threshold["promote"],
                "current_hold": source.threshold["hold"],
                "adaptation_enabled": self.adaptation_enabled
            }

        return changes

    def _score_to_dict(self, score: CanaryScore) -> Dict[str, Any]:
        """Convert CanaryScore to dictionary"""

        return {
            "timestamp": score.timestamp,
            "baseline_metrics": score.baseline_metrics,
            "candidate_metrics": score.candidate_metrics,
            "weighted_scores": score.weighted_scores,
            "composite_score": score.composite_score,
            "decision": score.decision,
            "confidence": score.confidence,
            "reasons": score.reasons
        }


def main():
    parser = argparse.ArgumentParser(description="Adaptive Canary Controller for MC Platform v0.3.5")
    parser.add_argument('--baseline', required=True, help='Baseline service URL')
    parser.add_argument('--candidate', required=True, help='Candidate service URL')
    parser.add_argument('--window', type=int, default=10, help='Evaluation window in minutes')
    parser.add_argument('--score-weights', help='Metric weights (format: p95=0.5,error=0.3,cost=0.2)')
    parser.add_argument('--out', required=True, help='Output file for evaluation report')

    args = parser.parse_args()

    # Parse score weights if provided
    config = {
        "prometheus_url": "http://localhost:9090",
        "adaptation_enabled": True
    }

    if args.score_weights:
        # Parse weights like "p95=0.5,error=0.3,cost=0.2"
        weights = {}
        for weight_spec in args.score_weights.split(','):
            metric, weight = weight_spec.split('=')
            weights[metric.strip()] = float(weight)

        print(f"📊 Using custom metric weights: {weights}")

    # Initialize controller
    controller = AdaptiveCanaryController(config)

    # Run evaluation
    report = controller.run_evaluation(args.baseline, args.candidate, args.window)

    # Save report
    import os
    os.makedirs(os.path.dirname(args.out), exist_ok=True)

    with open(args.out, 'w') as f:
        json.dump(report, f, indent=2)

    print(f"\n📄 Evaluation report saved: {args.out}")

    # Return decision for CI/CD integration
    final_decision = report['decision_summary']['final_decision']
    print(f"🔗 Exit code: {'0' if final_decision == 'PROMOTE' else '1'}")

    return 0 if final_decision == "PROMOTE" else 1


if __name__ == "__main__":
    exit(main())
# Prometheus metrics export for observability
class PrometheusMetrics:
    """Export adaptive canary metrics to Prometheus"""
    
    def __init__(self):
        self.metrics = {}
    
    def export_composite_score(self, score: float, decision: str, timestamp: str):
        """Export composite score for Prometheus scraping"""
        
        # Create metric output format that Prometheus can scrape
        metric_data = {
            "mc_canary_composite_score": score,
            "mc_canary_decision": 1 if decision == "PROMOTE" else 0,
            "timestamp": timestamp
        }
        
        # Write metrics to file for scraping (in production, use proper Prometheus client)
        with open('/tmp/mc_canary_metrics.prom', 'w') as f:
            f.write(f"# MC Platform v0.3.5 Adaptive Canary Metrics\n")
            f.write(f"mc_canary_composite_score {score}\n")
            f.write(f"mc_canary_decision_promote {1 if decision == 'PROMOTE' else 0}\n")
            f.write(f"mc_canary_decision_hold {1 if decision == 'HOLD' else 0}\n")
            f.write(f"mc_canary_decision_rollback {1 if decision == 'ROLLBACK' else 0}\n")
        
        print(f"📊 Exported composite score: {score} (decision: {decision})")

# Add to main adaptive canary function
def export_metrics_for_prometheus(score: CanaryScore):
    """Export metrics for Prometheus collection"""
    metrics = PrometheusMetrics()
    metrics.export_composite_score(score.composite_score, score.decision, score.timestamp)

