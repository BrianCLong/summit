"""
Python Client Examples for Predictive Threat Suite API

Demonstrates how to integrate the Predictive Suite API into Python applications.
"""

import requests
import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import time


class PredictiveSuiteClient:
    """
    Python client for the Predictive Threat Suite API.

    Usage:
        client = PredictiveSuiteClient("http://localhost:8091")

        # Generate forecast
        forecast = client.generate_forecast(
            signal_type="event_count",
            entity_id="auth_service",
            historical_data=[100, 105, 98, 110, 115],
            horizon="24h"
        )

        # Run simulation
        simulation = client.run_simulation(
            entity_id="auth_service",
            current_state={
                "threat_level": "high",
                "error_rate": 0.05,
                "latency_p95": 450
            },
            interventions=[
                {"type": "deploy_patch", "timing": "immediate", "parameters": {}}
            ]
        )
    """

    def __init__(self, base_url: str = "http://localhost:8091", timeout: int = 30):
        """
        Initialize the client.

        Args:
            base_url: Base URL of the Predictive Suite API
            timeout: Request timeout in seconds
        """
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.session = requests.Session()

    def generate_forecast(
        self,
        signal_type: str,
        entity_id: str,
        historical_data: List[float],
        horizon: str = "24h",
        confidence_level: float = 0.95,
        model_type: str = "arima"
    ) -> Dict[str, Any]:
        """
        Generate a time series forecast.

        Args:
            signal_type: Type of signal (event_count, latency_p95, error_rate, threat_score)
            entity_id: Entity identifier
            historical_data: List of historical values
            horizon: Forecast horizon (1h, 6h, 24h, 7d)
            confidence_level: Confidence level for intervals (0.5-0.99)
            model_type: Model to use (arima, exponential_smoothing)

        Returns:
            Forecast result with predictions and confidence intervals

        Raises:
            requests.HTTPError: If the API request fails
        """
        url = f"{self.base_url}/api/forecast"
        payload = {
            "signal_type": signal_type,
            "entity_id": entity_id,
            "historical_data": historical_data,
            "horizon": horizon,
            "confidence_level": confidence_level,
            "model_type": model_type
        }

        response = self.session.post(url, json=payload, timeout=self.timeout)
        response.raise_for_status()
        return response.json()

    def run_simulation(
        self,
        entity_id: str,
        current_state: Dict[str, Any],
        interventions: List[Dict[str, Any]],
        timeframe: str = "24h"
    ) -> Dict[str, Any]:
        """
        Run a counterfactual simulation.

        Args:
            entity_id: Entity identifier
            current_state: Current system state dict with threat_level, error_rate, etc.
            interventions: List of intervention dicts with type, timing, parameters
            timeframe: Simulation timeframe

        Returns:
            Simulation result with baseline, intervention outcomes, and recommendation

        Raises:
            requests.HTTPError: If the API request fails
        """
        url = f"{self.base_url}/api/simulate"
        payload = {
            "entity_id": entity_id,
            "current_state": current_state,
            "interventions": interventions,
            "timeframe": timeframe
        }

        response = self.session.post(url, json=payload, timeout=self.timeout)
        response.raise_for_status()
        return response.json()

    def get_health(self) -> Dict[str, Any]:
        """
        Check service health.

        Returns:
            Health status dict
        """
        url = f"{self.base_url}/health"
        response = self.session.get(url, timeout=5)
        response.raise_for_status()
        return response.json()

    def get_metrics(self) -> str:
        """
        Get Prometheus metrics.

        Returns:
            Prometheus metrics in text format
        """
        url = f"{self.base_url}/metrics"
        response = self.session.get(url, timeout=5)
        response.raise_for_status()
        return response.text


# Example 1: Basic Forecast
def example_basic_forecast():
    """Generate a simple event count forecast."""
    client = PredictiveSuiteClient()

    # Historical data: daily event counts for the past 30 days
    historical_data = [
        100, 105, 98, 110, 115, 108, 120, 125, 118, 130,
        135, 128, 140, 145, 138, 150, 155, 148, 160, 165,
        158, 170, 175, 168, 180, 185, 178, 190, 195, 188
    ]

    forecast = client.generate_forecast(
        signal_type="event_count",
        entity_id="auth_service",
        historical_data=historical_data,
        horizon="24h",
        confidence_level=0.95,
        model_type="arima"
    )

    print("📊 Forecast Generated:")
    print(f"  Entity: {forecast['entity_id']}")
    print(f"  Signal: {forecast['signal_type']}")
    print(f"  Horizon: {forecast['forecast_horizon']}")
    print(f"  Model: {forecast['model_info']['type']}")
    print(f"  MAPE: {forecast['model_info']['accuracy_metrics']['mape']:.2f}%")
    print(f"\n  First 5 predictions:")

    for i, fp in enumerate(forecast['forecasts'][:5]):
        print(f"    {i+1}h: {fp['predicted_value']:.1f} "
              f"[{fp['lower_bound']:.1f}, {fp['upper_bound']:.1f}]")

    return forecast


# Example 2: Latency Forecast with Comparison
def example_latency_forecast_comparison():
    """Compare ARIMA vs Exponential Smoothing for latency forecasting."""
    client = PredictiveSuiteClient()

    # Historical latency data (p95 in milliseconds)
    import numpy as np
    np.random.seed(42)
    historical_data = list(200 + np.cumsum(np.random.randn(100) * 5))

    print("🔄 Comparing forecasting models...\n")

    for model_type in ["arima", "exponential_smoothing"]:
        forecast = client.generate_forecast(
            signal_type="latency_p95",
            entity_id="api_gateway",
            historical_data=historical_data,
            horizon="6h",
            model_type=model_type
        )

        mape = forecast['model_info']['accuracy_metrics']['mape']
        rmse = forecast['model_info']['accuracy_metrics']['rmse']

        print(f"{model_type.upper()}:")
        print(f"  MAPE: {mape:.2f}%")
        print(f"  RMSE: {rmse:.2f}")
        print(f"  First prediction: {forecast['forecasts'][0]['predicted_value']:.1f}ms\n")


# Example 3: High-Threat Simulation
def example_high_threat_simulation():
    """Simulate response to a high-threat scenario."""
    client = PredictiveSuiteClient()

    simulation = client.run_simulation(
        entity_id="payment_service",
        current_state={
            "threat_level": "high",
            "error_rate": 0.08,
            "latency_p95": 650,
            "request_rate": 200,
            "resource_utilization": 0.85
        },
        interventions=[
            {
                "type": "deploy_patch",
                "timing": "immediate",
                "parameters": {"rollout_percentage": 50}
            },
            {
                "type": "rate_limit",
                "timing": "immediate",
                "parameters": {"limit": 1000}
            },
            {
                "type": "circuit_breaker",
                "timing": "immediate",
                "parameters": {"error_threshold": 0.05}
            },
            {
                "type": "rollback",
                "timing": "immediate",
                "parameters": {}
            }
        ]
    )

    print("🚨 Simulation Results:")
    print(f"  Entity: {simulation['entity_id']}")
    print(f"  Scenario ID: {simulation['scenario_id']}")

    baseline = simulation['baseline_outcome']
    print(f"\n  Baseline (no intervention):")
    print(f"    Threat escalation: {baseline['threat_escalation_probability']*100:.1f}%")
    print(f"    Expected error rate: {baseline['expected_error_rate']*100:.2f}%")
    print(f"    Expected latency: {baseline['expected_latency_p95']:.0f}ms")

    print(f"\n  Intervention Analysis:")
    for outcome in simulation['intervention_outcomes']:
        risk_reduction = outcome['impact']['risk_reduction'] * 100
        confidence = outcome['confidence'] * 100
        print(f"\n    {outcome['intervention_type']}:")
        print(f"      Risk reduction: {risk_reduction:.1f}%")
        print(f"      Confidence: {confidence:.1f}%")
        print(f"      Time to effect: {outcome['time_to_effect']} minutes")
        print(f"      Post-intervention risk: "
              f"{outcome['impact']['threat_escalation_probability']*100:.1f}%")

    rec = simulation['recommendation']
    print(f"\n  🎯 Recommendation:")
    print(f"    Action: {rec['action']}")
    print(f"    Priority: {rec['priority'].upper()}")
    print(f"    Reasoning: {rec['reasoning']}")

    return simulation


# Example 4: Continuous Monitoring
def example_continuous_monitoring():
    """Continuously monitor and forecast a metric."""
    client = PredictiveSuiteClient()

    print("📈 Starting continuous monitoring...")
    print("   (Press Ctrl+C to stop)\n")

    # Simulate continuous data collection
    historical_data = list(range(100, 130))

    try:
        while True:
            # Generate forecast
            forecast = client.generate_forecast(
                signal_type="event_count",
                entity_id="realtime_monitor",
                historical_data=historical_data[-50:],  # Use last 50 points
                horizon="1h",
                model_type="exponential_smoothing"
            )

            # Get next prediction
            next_pred = forecast['forecasts'][0]

            timestamp = datetime.now().strftime("%H:%M:%S")
            print(f"[{timestamp}] Next hour prediction: "
                  f"{next_pred['predicted_value']:.1f} "
                  f"[{next_pred['lower_bound']:.1f}, {next_pred['upper_bound']:.1f}]")

            # Simulate new data point (in real scenario, this would be actual data)
            import random
            new_value = historical_data[-1] + random.randint(-5, 5)
            historical_data.append(new_value)

            time.sleep(60)  # Wait 1 minute

    except KeyboardInterrupt:
        print("\n\nMonitoring stopped.")


# Example 5: Batch Processing
def example_batch_forecasting():
    """Generate forecasts for multiple entities."""
    client = PredictiveSuiteClient()

    entities = ["auth_service", "payment_service", "user_service", "api_gateway"]

    print("🔄 Batch forecasting for multiple entities...\n")

    results = {}

    for entity_id in entities:
        # Generate synthetic data for each entity
        import numpy as np
        np.random.seed(hash(entity_id) % 1000)
        historical_data = list(100 + np.cumsum(np.random.randn(50)))

        try:
            forecast = client.generate_forecast(
                signal_type="event_count",
                entity_id=entity_id,
                historical_data=historical_data,
                horizon="24h"
            )

            results[entity_id] = forecast

            mape = forecast['model_info']['accuracy_metrics']['mape']
            next_value = forecast['forecasts'][0]['predicted_value']

            print(f"✅ {entity_id:20} | MAPE: {mape:5.1f}% | "
                  f"Next hour: {next_value:.1f}")

        except Exception as e:
            print(f"❌ {entity_id:20} | Error: {str(e)}")

    print(f"\n📊 Successfully forecasted {len(results)}/{len(entities)} entities")

    return results


# Example 6: Error Handling
def example_error_handling():
    """Demonstrate proper error handling."""
    client = PredictiveSuiteClient()

    print("🛠️  Testing error handling...\n")

    # Test 1: Invalid signal type
    try:
        forecast = client.generate_forecast(
            signal_type="invalid_type",
            entity_id="test",
            historical_data=[1, 2, 3],
            horizon="24h"
        )
    except requests.HTTPError as e:
        print(f"✅ Caught expected error for invalid signal type: {e.response.status_code}")

    # Test 2: Insufficient data
    try:
        forecast = client.generate_forecast(
            signal_type="event_count",
            entity_id="test",
            historical_data=[1],  # Too few points
            horizon="24h"
        )
    except requests.HTTPError as e:
        print(f"✅ Caught expected error for insufficient data: {e.response.status_code}")

    # Test 3: Invalid confidence level
    try:
        forecast = client.generate_forecast(
            signal_type="event_count",
            entity_id="test",
            historical_data=list(range(50)),
            horizon="24h",
            confidence_level=1.5  # Invalid
        )
    except requests.HTTPError as e:
        print(f"✅ Caught expected error for invalid confidence: {e.response.status_code}")

    # Test 4: Service health check
    try:
        health = client.get_health()
        print(f"✅ Service is healthy: {health['status']}")
    except Exception as e:
        print(f"❌ Service health check failed: {str(e)}")


# Example 7: Integration with Pandas
def example_pandas_integration():
    """Integrate with pandas DataFrame."""
    try:
        import pandas as pd
        import numpy as np
    except ImportError:
        print("⚠️  This example requires pandas. Install with: pip install pandas")
        return

    client = PredictiveSuiteClient()

    # Create sample dataframe
    dates = pd.date_range(start='2025-01-01', periods=90, freq='D')
    df = pd.DataFrame({
        'date': dates,
        'event_count': 100 + np.cumsum(np.random.randn(90) * 5)
    })

    print("📊 DataFrame Integration Example\n")
    print("Historical data (last 5 days):")
    print(df.tail())

    # Generate forecast
    forecast = client.generate_forecast(
        signal_type="event_count",
        entity_id="pandas_example",
        historical_data=df['event_count'].tolist(),
        horizon="7d"
    )

    # Convert forecast to DataFrame
    forecast_df = pd.DataFrame([
        {
            'date': pd.to_datetime(fp['timestamp']),
            'predicted': fp['predicted_value'],
            'lower': fp['lower_bound'],
            'upper': fp['upper_bound']
        }
        for fp in forecast['forecasts']
    ])

    print("\nForecast (next 7 days):")
    print(forecast_df)

    return df, forecast_df


if __name__ == "__main__":
    print("=" * 80)
    print("  Predictive Threat Suite - Python Client Examples")
    print("=" * 80)
    print()

    # Check service health first
    client = PredictiveSuiteClient()
    try:
        health = client.get_health()
        print(f"✅ Service is healthy: {health['status']}\n")
    except Exception as e:
        print(f"❌ Cannot connect to service: {str(e)}")
        print("   Make sure the service is running on http://localhost:8091\n")
        exit(1)

    # Run examples
    print("\n" + "=" * 80)
    print("Example 1: Basic Forecast")
    print("=" * 80)
    example_basic_forecast()

    print("\n" + "=" * 80)
    print("Example 2: Model Comparison")
    print("=" * 80)
    example_latency_forecast_comparison()

    print("\n" + "=" * 80)
    print("Example 3: High-Threat Simulation")
    print("=" * 80)
    example_high_threat_simulation()

    print("\n" + "=" * 80)
    print("Example 4: Batch Processing")
    print("=" * 80)
    example_batch_forecasting()

    print("\n" + "=" * 80)
    print("Example 5: Error Handling")
    print("=" * 80)
    example_error_handling()

    print("\n" + "=" * 80)
    print("Example 6: Pandas Integration")
    print("=" * 80)
    example_pandas_integration()

    print("\n✅ All examples completed!")
