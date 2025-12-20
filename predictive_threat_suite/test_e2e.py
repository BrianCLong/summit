"""
End-to-end tests for Predictive Threat Suite

Tests the full pipeline from data ingestion through forecasting/simulation
to metrics export and validation.
"""

import pytest
import numpy as np
from datetime import datetime, timedelta
import requests
import time

from forecasting_service import (
    ForecastingService,
    prepare_event_count_data,
    prepare_latency_data,
    prepare_error_rate_data,
)
from counterfactual_service import (
    CounterfactualService,
    ThreatLevel,
    CurrentState,
    InterventionParameters,
    InterventionType,
)
from api_service import app


class TestForecastingService:
    """Test suite for forecasting service."""

    def setup_method(self):
        """Set up test fixtures."""
        self.service = ForecastingService()

        # Generate realistic synthetic data
        np.random.seed(42)

        # Event count data: base=100, with daily seasonality and trend
        days = 90
        time_points = np.linspace(0, days, days * 24)  # Hourly data for 90 days
        trend = 0.5 * time_points
        seasonality = 20 * np.sin(2 * np.pi * time_points / 24)  # Daily cycle
        noise = np.random.normal(0, 5, len(time_points))
        self.event_count_data = np.maximum(100 + trend + seasonality + noise, 0)

        # Latency data: base=200ms, with spikes
        self.latency_data = np.random.gamma(shape=2, scale=100, size=1000)
        self.latency_data = np.clip(self.latency_data, 50, 1000)

        # Error rate data: base=0.01, with occasional spikes
        self.error_rate_data = np.random.beta(a=1, b=99, size=1000)
        spike_indices = np.random.choice(1000, size=10, replace=False)
        self.error_rate_data[spike_indices] *= 5
        self.error_rate_data = np.clip(self.error_rate_data, 0, 0.5)

    def test_arima_forecast_event_count(self):
        """Test ARIMA forecasting on event count data."""
        result = self.service.generate_forecast(
            signal_type="event_count",
            entity_id="test_service",
            historical_data=self.event_count_data,
            horizon="24h",
            confidence_level=0.95,
            model_type="arima"
        )

        # Validate result structure
        assert result.signal_type == "event_count"
        assert result.entity_id == "test_service"
        assert result.forecast_horizon == "24h"
        assert len(result.forecasts) == 24  # 24 hourly points

        # Validate forecast points
        for fp in result.forecasts:
            assert fp.predicted_value >= 0
            assert fp.lower_bound < fp.predicted_value
            assert fp.upper_bound > fp.predicted_value
            assert fp.confidence == 0.95
            assert isinstance(fp.timestamp, datetime)

        # Validate model metrics
        metrics = result.model_info.accuracy_metrics
        assert 0 <= metrics.mape <= 100  # MAPE should be reasonable
        assert metrics.rmse >= 0
        assert metrics.mae >= 0
        assert -1 <= metrics.r_squared <= 1

        print(f"\n✅ ARIMA Forecast Test Passed")
        print(f"   Entity: {result.entity_id}")
        print(f"   Model: {result.model_info.type}")
        print(f"   MAPE: {metrics.mape:.2f}%")
        print(f"   RMSE: {metrics.rmse:.2f}")
        print(f"   First prediction: {result.forecasts[0].predicted_value:.2f}")
        print(f"   Confidence interval: [{result.forecasts[0].lower_bound:.2f}, {result.forecasts[0].upper_bound:.2f}]")

    def test_exponential_smoothing_forecast(self):
        """Test exponential smoothing forecasting."""
        result = self.service.generate_forecast(
            signal_type="latency_p95",
            entity_id="api_gateway",
            historical_data=self.latency_data,
            horizon="6h",
            confidence_level=0.80,
            model_type="exponential_smoothing"
        )

        assert result.signal_type == "latency_p95"
        assert len(result.forecasts) == 12  # 12 points for 6h
        assert result.model_info.type == "exponential_smoothing"

        print(f"\n✅ Exponential Smoothing Test Passed")
        print(f"   Entity: {result.entity_id}")
        print(f"   Horizon: {result.forecast_horizon}")
        print(f"   Forecast points: {len(result.forecasts)}")

    def test_forecast_consistency(self):
        """Test that forecasts are consistent over multiple runs."""
        result1 = self.service.generate_forecast(
            signal_type="error_rate",
            entity_id="auth_service",
            historical_data=self.error_rate_data,
            horizon="24h",
            model_type="arima"
        )

        result2 = self.service.generate_forecast(
            signal_type="error_rate",
            entity_id="auth_service",
            historical_data=self.error_rate_data,
            horizon="24h",
            model_type="arima"
        )

        # Results should be similar (within 10%)
        for fp1, fp2 in zip(result1.forecasts, result2.forecasts):
            diff_pct = abs(fp1.predicted_value - fp2.predicted_value) / (fp1.predicted_value + 1e-10)
            assert diff_pct < 0.1

        print(f"\n✅ Forecast Consistency Test Passed")

    def test_data_preparation_functions(self):
        """Test data preparation utility functions."""
        # Test event count preparation
        events = [
            {"timestamp": datetime.utcnow() - timedelta(hours=i), "event_id": f"evt_{i}"}
            for i in range(100)
        ]
        event_counts = prepare_event_count_data(events, window_minutes=60)
        assert len(event_counts) > 0
        assert all(c >= 0 for c in event_counts)

        # Test latency data preparation
        latency_metrics = [
            {"p95": float(x), "timestamp": datetime.utcnow()}
            for x in self.latency_data[:100]
        ]
        latency_series = prepare_latency_data(latency_metrics)
        assert len(latency_series) == 100

        # Test error rate preparation
        request_metrics = [
            {"total": 100, "errors": int(r * 100), "timestamp": datetime.utcnow()}
            for r in self.error_rate_data[:100]
        ]
        error_rates = prepare_error_rate_data(request_metrics)
        assert len(error_rates) == 100
        assert all(0 <= r <= 1 for r in error_rates)

        print(f"\n✅ Data Preparation Test Passed")


class TestCounterfactualService:
    """Test suite for counterfactual simulation service."""

    def setup_method(self):
        """Set up test fixtures."""
        self.service = CounterfactualService()

    def test_baseline_simulation(self):
        """Test baseline scenario simulation."""
        state = CurrentState(
            threat_level=ThreatLevel.HIGH,
            error_rate=0.05,
            latency_p95=450.0,
            request_rate=100.0,
            resource_utilization=0.7
        )

        baseline = self.service.causal_model.simulate_baseline(state)

        assert 0 <= baseline.threat_escalation_probability <= 1
        assert 0 <= baseline.expected_error_rate <= 1
        assert baseline.expected_latency_p95 >= 0
        assert 0 <= baseline.expected_availability <= 1
        assert baseline.risk_reduction == 0.0

        print(f"\n✅ Baseline Simulation Test Passed")
        print(f"   Threat escalation probability: {baseline.threat_escalation_probability:.2%}")
        print(f"   Expected error rate: {baseline.expected_error_rate:.2%}")
        print(f"   Expected latency: {baseline.expected_latency_p95:.0f}ms")

    def test_intervention_simulation(self):
        """Test intervention simulation."""
        state = CurrentState(
            threat_level=ThreatLevel.HIGH,
            error_rate=0.05,
            latency_p95=450.0,
            request_rate=100.0,
            resource_utilization=0.7
        )

        intervention = InterventionParameters(
            type=InterventionType.DEPLOY_PATCH,
            timing="immediate",
            parameters={"rollout_percentage": 50}
        )

        baseline = self.service.causal_model.simulate_baseline(state)
        outcome = self.service.causal_model.simulate_intervention(
            state, intervention, baseline
        )

        assert outcome.intervention_type == InterventionType.DEPLOY_PATCH
        assert 0 <= outcome.probability <= 1
        assert 0 <= outcome.confidence <= 1
        assert 0 <= outcome.cost_estimate <= 1
        assert outcome.time_to_effect >= 0

        # Intervention should reduce risk
        assert outcome.impact.threat_escalation_probability < baseline.threat_escalation_probability

        print(f"\n✅ Intervention Simulation Test Passed")
        print(f"   Intervention: {outcome.intervention_type.value}")
        print(f"   Success probability: {outcome.probability:.2%}")
        print(f"   Risk reduction: {outcome.impact.risk_reduction:.2%}")
        print(f"   Confidence: {outcome.confidence:.2%}")

    def test_full_scenario_simulation(self):
        """Test full scenario with multiple interventions."""
        state = CurrentState(
            threat_level=ThreatLevel.CRITICAL,
            error_rate=0.10,
            latency_p95=800.0,
            request_rate=200.0,
            resource_utilization=0.9
        )

        interventions = [
            InterventionParameters(
                type=InterventionType.DEPLOY_PATCH,
                timing="immediate",
                parameters={}
            ),
            InterventionParameters(
                type=InterventionType.RATE_LIMIT,
                timing="immediate",
                parameters={"limit": 1000}
            ),
            InterventionParameters(
                type=InterventionType.ROLLBACK,
                timing="immediate",
                parameters={}
            ),
        ]

        result = self.service.simulate_scenario(
            entity_id="critical_service",
            current_state=state,
            interventions=interventions
        )

        assert result.entity_id == "critical_service"
        assert len(result.intervention_outcomes) == 3
        assert result.recommendation.action in [i.type for i in interventions]
        assert result.recommendation.priority in ["low", "medium", "high", "critical"]

        print(f"\n✅ Full Scenario Simulation Test Passed")
        print(f"   Scenario ID: {result.scenario_id}")
        print(f"   Interventions tested: {len(result.intervention_outcomes)}")
        print(f"   Recommendation: {result.recommendation.action.value}")
        print(f"   Priority: {result.recommendation.priority}")
        print(f"   Reasoning: {result.recommendation.reasoning}")

    def test_quick_simulate(self):
        """Test quick simulation helper method."""
        result = self.service.quick_simulate(
            entity_id="test_service",
            threat_level=ThreatLevel.MEDIUM,
            error_rate=0.03,
            latency_p95=300.0
        )

        assert result.entity_id == "test_service"
        assert len(result.intervention_outcomes) > 0
        assert result.recommendation is not None

        print(f"\n✅ Quick Simulate Test Passed")


class TestEndToEndIntegration:
    """End-to-end integration tests."""

    def test_forecast_to_metrics_flow(self):
        """Test complete flow from forecast generation to metrics."""
        service = ForecastingService()

        # Generate synthetic data
        np.random.seed(42)
        historical_data = np.cumsum(np.random.randn(200)) + 100
        historical_data = np.maximum(historical_data, 0)

        # Generate forecast
        result = service.generate_forecast(
            signal_type="event_count",
            entity_id="integration_test",
            historical_data=historical_data,
            horizon="24h",
            model_type="arima"
        )

        # Validate complete result
        assert result is not None
        assert len(result.forecasts) > 0

        # Simulate metrics collection
        metrics_data = {
            "predicted_values": [fp.predicted_value for fp in result.forecasts],
            "lower_bounds": [fp.lower_bound for fp in result.forecasts],
            "upper_bounds": [fp.upper_bound for fp in result.forecasts],
            "accuracy_mape": result.model_info.accuracy_metrics.mape,
            "accuracy_rmse": result.model_info.accuracy_metrics.rmse,
        }

        assert len(metrics_data["predicted_values"]) == 24
        assert all(lb < pv < ub for lb, pv, ub in zip(
            metrics_data["lower_bounds"],
            metrics_data["predicted_values"],
            metrics_data["upper_bounds"]
        ))

        print(f"\n✅ Forecast-to-Metrics Flow Test Passed")
        print(f"   Forecast points generated: {len(result.forecasts)}")
        print(f"   Model accuracy (MAPE): {metrics_data['accuracy_mape']:.2f}%")

    def test_simulation_to_metrics_flow(self):
        """Test complete flow from simulation to metrics."""
        service = CounterfactualService()

        result = service.quick_simulate(
            entity_id="integration_test",
            threat_level=ThreatLevel.HIGH,
            error_rate=0.08,
            latency_p95=500.0
        )

        # Simulate metrics collection
        metrics_data = {
            "baseline_risk": result.baseline_outcome.threat_escalation_probability,
            "recommendation_priority": result.recommendation.priority,
            "recommended_action": result.recommendation.action.value,
            "intervention_count": len(result.intervention_outcomes),
        }

        assert 0 <= metrics_data["baseline_risk"] <= 1
        assert metrics_data["recommendation_priority"] in ["low", "medium", "high", "critical"]
        assert metrics_data["intervention_count"] > 0

        print(f"\n✅ Simulation-to-Metrics Flow Test Passed")
        print(f"   Baseline risk: {metrics_data['baseline_risk']:.2%}")
        print(f"   Recommended: {metrics_data['recommended_action']}")
        print(f"   Priority: {metrics_data['recommendation_priority']}")


def generate_sample_dataset(filename: str = "sample_dataset.npz"):
    """
    Generate and save a sample dataset for testing.

    Args:
        filename: Output filename
    """
    np.random.seed(42)

    # Event count time series (90 days, hourly)
    days = 90
    hours = days * 24
    time_points = np.arange(hours)
    trend = 0.3 * time_points
    daily_cycle = 30 * np.sin(2 * np.pi * time_points / 24)
    weekly_cycle = 15 * np.sin(2 * np.pi * time_points / (24 * 7))
    noise = np.random.normal(0, 10, hours)
    event_counts = np.maximum(100 + trend + daily_cycle + weekly_cycle + noise, 0)

    # Latency time series (p95)
    latencies = np.random.gamma(shape=3, scale=80, size=hours)
    latencies = np.clip(latencies, 50, 2000)

    # Error rate time series
    error_rates = np.random.beta(a=1, b=199, size=hours)
    spike_indices = np.random.choice(hours, size=50, replace=False)
    error_rates[spike_indices] *= 10
    error_rates = np.clip(error_rates, 0, 0.5)

    # Save dataset
    np.savez(
        filename,
        event_counts=event_counts,
        latencies=latencies,
        error_rates=error_rates,
        timestamps=time_points
    )

    print(f"\n📊 Sample dataset generated: {filename}")
    print(f"   Event counts: {len(event_counts)} points")
    print(f"   Latencies: {len(latencies)} points")
    print(f"   Error rates: {len(error_rates)} points")

    return filename


if __name__ == "__main__":
    # Run tests with pytest
    print("=" * 80)
    print("PREDICTIVE THREAT SUITE - END-TO-END TESTS")
    print("=" * 80)

    # Generate sample dataset
    dataset_file = generate_sample_dataset("/home/user/summit/predictive_threat_suite/sample_dataset.npz")

    # Run pytest
    pytest.main([
        __file__,
        "-v",
        "--tb=short",
        "--color=yes"
    ])
