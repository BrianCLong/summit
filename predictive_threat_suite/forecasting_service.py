"""
Predictive Threat Suite - Timeline Forecasting Service

Provides time series forecasting with confidence bands for threat intelligence signals.
Supports multiple forecast models (ARIMA, Exponential Smoothing) and signal types.
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Literal, Optional
from dataclasses import dataclass, asdict
import numpy as np
from scipy import stats

logger = logging.getLogger(__name__)


SignalType = Literal["event_count", "latency_p95", "error_rate", "threat_score"]
ForecastHorizon = Literal["1h", "6h", "24h", "7d"]
ModelType = Literal["arima", "exponential_smoothing", "linear_trend"]


@dataclass
class ForecastPoint:
    """A single forecast data point with confidence intervals."""
    timestamp: datetime
    predicted_value: float
    lower_bound: float
    upper_bound: float
    confidence: float


@dataclass
class ModelMetrics:
    """Model accuracy and performance metrics."""
    mape: float  # Mean Absolute Percentage Error
    rmse: float  # Root Mean Square Error
    mae: float   # Mean Absolute Error
    r_squared: float  # Coefficient of determination


@dataclass
class ModelInfo:
    """Information about the forecasting model used."""
    type: ModelType
    parameters: dict[str, Any]
    accuracy_metrics: ModelMetrics


@dataclass
class ForecastResult:
    """Complete forecast result with metadata."""
    signal_type: SignalType
    entity_id: str
    forecast_horizon: ForecastHorizon
    generated_at: datetime
    forecasts: list[ForecastPoint]
    model_info: ModelInfo


class ARIMAForecaster:
    """
    Simplified ARIMA forecaster for time series prediction.

    In production, this would use statsmodels or pmdarima for full ARIMA implementation.
    For alpha, we implement a simplified version with AR component.
    """

    def __init__(self, p: int = 2, d: int = 1, q: int = 2):
        """
        Initialize ARIMA model.

        Args:
            p: Order of autoregressive component
            d: Degree of differencing
            q: Order of moving average component
        """
        self.p = p
        self.d = d
        self.q = q
        self.coefficients: Optional[np.ndarray] = None
        self.residuals: Optional[np.ndarray] = None

    def fit(self, data: np.ndarray) -> None:
        """
        Fit ARIMA model to historical data.

        Args:
            data: Historical time series data
        """
        # Differencing for stationarity
        diff_data = np.diff(data, n=self.d)

        # Simple AR model using least squares
        if len(diff_data) > self.p:
            X = np.column_stack([
                np.roll(diff_data, i)[self.p:]
                for i in range(1, self.p + 1)
            ])
            y = diff_data[self.p:]

            # Least squares estimation
            self.coefficients = np.linalg.lstsq(X, y, rcond=None)[0]

            # Calculate residuals
            predictions = X @ self.coefficients
            self.residuals = y - predictions
        else:
            # Fallback to mean if insufficient data
            self.coefficients = np.array([np.mean(diff_data)])
            self.residuals = np.array([0.0])

    def forecast(
        self,
        data: np.ndarray,
        steps: int,
        confidence: float = 0.95
    ) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Generate forecast with confidence intervals.

        Args:
            data: Historical data
            steps: Number of steps to forecast
            confidence: Confidence level (0-1)

        Returns:
            Tuple of (forecasts, lower_bounds, upper_bounds)
        """
        if self.coefficients is None:
            self.fit(data)

        forecasts = []
        last_values = np.diff(data[-self.p:], n=0)  # Use original scale

        # Generate forecasts
        for _ in range(steps):
            if len(last_values) >= self.p and self.coefficients is not None:
                # AR prediction
                diff_forecast = np.dot(
                    last_values[-self.p:],
                    self.coefficients
                )
            else:
                # Fallback to last value
                diff_forecast = 0

            # Integrate back (reverse differencing)
            forecast = data[-1] + diff_forecast
            forecasts.append(forecast)

            # Update last values
            last_values = np.append(last_values, diff_forecast)
            data = np.append(data, forecast)

        forecasts = np.array(forecasts)

        # Calculate confidence intervals
        z_score = stats.norm.ppf((1 + confidence) / 2)
        std_error = np.std(self.residuals) if self.residuals is not None else np.std(data) * 0.1

        margin = z_score * std_error * np.sqrt(np.arange(1, steps + 1))
        lower_bounds = forecasts - margin
        upper_bounds = forecasts + margin

        return forecasts, lower_bounds, upper_bounds


class ExponentialSmoothingForecaster:
    """
    Exponential smoothing forecaster with trend component.
    Implements Holt's linear trend method.
    """

    def __init__(self, alpha: float = 0.3, beta: float = 0.1):
        """
        Initialize exponential smoothing model.

        Args:
            alpha: Smoothing parameter for level (0-1)
            beta: Smoothing parameter for trend (0-1)
        """
        self.alpha = alpha
        self.beta = beta
        self.level: Optional[float] = None
        self.trend: Optional[float] = None

    def fit(self, data: np.ndarray) -> None:
        """
        Fit exponential smoothing model.

        Args:
            data: Historical time series data
        """
        if len(data) < 2:
            self.level = data[0] if len(data) > 0 else 0
            self.trend = 0
            return

        # Initialize level and trend
        self.level = data[0]
        self.trend = data[1] - data[0]

        # Update through the series
        for value in data[1:]:
            prev_level = self.level
            self.level = self.alpha * value + (1 - self.alpha) * (self.level + self.trend)
            self.trend = self.beta * (self.level - prev_level) + (1 - self.beta) * self.trend

    def forecast(
        self,
        data: np.ndarray,
        steps: int,
        confidence: float = 0.95
    ) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Generate forecast with confidence intervals.

        Args:
            data: Historical data
            steps: Number of steps to forecast
            confidence: Confidence level (0-1)

        Returns:
            Tuple of (forecasts, lower_bounds, upper_bounds)
        """
        if self.level is None or self.trend is None:
            self.fit(data)

        # Generate forecasts
        forecasts = np.array([
            self.level + (i + 1) * self.trend
            for i in range(steps)
        ])

        # Calculate confidence intervals
        z_score = stats.norm.ppf((1 + confidence) / 2)
        std_error = np.std(data) * 0.1  # Simplified error estimation

        margin = z_score * std_error * np.sqrt(np.arange(1, steps + 1))
        lower_bounds = forecasts - margin
        upper_bounds = forecasts + margin

        return forecasts, lower_bounds, upper_bounds


class ForecastingService:
    """
    Main service for generating time series forecasts.
    """

    def __init__(self):
        self.models: dict[str, Any] = {}

    def _parse_horizon(self, horizon: ForecastHorizon) -> tuple[int, timedelta]:
        """
        Parse forecast horizon into steps and time delta.

        Args:
            horizon: Forecast horizon string

        Returns:
            Tuple of (steps, timedelta per step)
        """
        horizon_map = {
            "1h": (4, timedelta(minutes=15)),      # 4 points, 15min each
            "6h": (12, timedelta(minutes=30)),     # 12 points, 30min each
            "24h": (24, timedelta(hours=1)),       # 24 points, 1h each
            "7d": (28, timedelta(hours=6)),        # 28 points, 6h each
        }
        return horizon_map[horizon]

    def _calculate_metrics(
        self,
        actual: np.ndarray,
        predicted: np.ndarray
    ) -> ModelMetrics:
        """
        Calculate model accuracy metrics.

        Args:
            actual: Actual values
            predicted: Predicted values

        Returns:
            ModelMetrics object
        """
        # Ensure same length
        min_len = min(len(actual), len(predicted))
        actual = actual[:min_len]
        predicted = predicted[:min_len]

        # MAPE - Mean Absolute Percentage Error
        mape = np.mean(np.abs((actual - predicted) / (actual + 1e-10))) * 100

        # RMSE - Root Mean Square Error
        rmse = np.sqrt(np.mean((actual - predicted) ** 2))

        # MAE - Mean Absolute Error
        mae = np.mean(np.abs(actual - predicted))

        # R-squared
        ss_res = np.sum((actual - predicted) ** 2)
        ss_tot = np.sum((actual - np.mean(actual)) ** 2)
        r_squared = 1 - (ss_res / (ss_tot + 1e-10))

        return ModelMetrics(
            mape=float(mape),
            rmse=float(rmse),
            mae=float(mae),
            r_squared=float(r_squared)
        )

    def generate_forecast(
        self,
        signal_type: SignalType,
        entity_id: str,
        historical_data: np.ndarray,
        horizon: ForecastHorizon = "24h",
        confidence_level: float = 0.95,
        model_type: ModelType = "arima"
    ) -> ForecastResult:
        """
        Generate a forecast for a given signal.

        Args:
            signal_type: Type of signal to forecast
            entity_id: Entity identifier
            historical_data: Historical time series data
            horizon: Forecast horizon
            confidence_level: Confidence level for intervals (0-1)
            model_type: Type of forecasting model to use

        Returns:
            ForecastResult with predictions and confidence intervals
        """
        logger.info(
            f"Generating {model_type} forecast for {entity_id} "
            f"({signal_type}) with horizon {horizon}"
        )

        # Parse horizon
        steps, time_delta = self._parse_horizon(horizon)

        # Select and fit model
        if model_type == "arima":
            model = ARIMAForecaster(p=2, d=1, q=2)
        elif model_type == "exponential_smoothing":
            model = ExponentialSmoothingForecaster(alpha=0.3, beta=0.1)
        else:
            # Fallback to simple linear trend
            model = ExponentialSmoothingForecaster(alpha=0.5, beta=0.3)

        # Generate forecasts
        forecasts, lower_bounds, upper_bounds = model.forecast(
            historical_data,
            steps=steps,
            confidence=confidence_level
        )

        # Create forecast points
        base_time = datetime.utcnow()
        forecast_points = [
            ForecastPoint(
                timestamp=base_time + (i + 1) * time_delta,
                predicted_value=float(forecasts[i]),
                lower_bound=float(lower_bounds[i]),
                upper_bound=float(upper_bounds[i]),
                confidence=confidence_level
            )
            for i in range(steps)
        ]

        # Calculate accuracy metrics using last N points
        test_size = min(len(historical_data) // 4, 20)
        if test_size > 0:
            train_data = historical_data[:-test_size]
            test_data = historical_data[-test_size:]

            test_forecasts, _, _ = model.forecast(train_data, steps=test_size)
            metrics = self._calculate_metrics(test_data, test_forecasts)
        else:
            # No test data available
            metrics = ModelMetrics(mape=0.0, rmse=0.0, mae=0.0, r_squared=1.0)

        # Build model info
        model_info = ModelInfo(
            type=model_type,
            parameters={
                "p": getattr(model, "p", None),
                "d": getattr(model, "d", None),
                "q": getattr(model, "q", None),
                "alpha": getattr(model, "alpha", None),
                "beta": getattr(model, "beta", None),
            },
            accuracy_metrics=metrics
        )

        return ForecastResult(
            signal_type=signal_type,
            entity_id=entity_id,
            forecast_horizon=horizon,
            generated_at=datetime.utcnow(),
            forecasts=forecast_points,
            model_info=model_info
        )


# Utility functions for data preparation
def prepare_event_count_data(
    events: list[dict[str, Any]],
    window_minutes: int = 60
) -> np.ndarray:
    """
    Prepare event count time series data.

    Args:
        events: List of events with timestamps
        window_minutes: Aggregation window in minutes

    Returns:
        Array of event counts per window
    """
    if not events:
        return np.array([0.0])

    # Sort events by timestamp
    sorted_events = sorted(events, key=lambda e: e["timestamp"])

    # Aggregate into windows
    start_time = sorted_events[0]["timestamp"]
    end_time = sorted_events[-1]["timestamp"]
    window_delta = timedelta(minutes=window_minutes)

    counts = []
    current_window = start_time

    while current_window <= end_time:
        next_window = current_window + window_delta
        count = sum(
            1 for e in sorted_events
            if current_window <= e["timestamp"] < next_window
        )
        counts.append(float(count))
        current_window = next_window

    return np.array(counts) if counts else np.array([0.0])


def prepare_latency_data(
    latency_metrics: list[dict[str, Any]]
) -> np.ndarray:
    """
    Prepare latency time series data.

    Args:
        latency_metrics: List of latency measurements

    Returns:
        Array of latency values
    """
    return np.array([
        m.get("p95", m.get("value", 0.0))
        for m in latency_metrics
    ])


def prepare_error_rate_data(
    request_metrics: list[dict[str, Any]]
) -> np.ndarray:
    """
    Prepare error rate time series data.

    Args:
        request_metrics: List of request metrics with success/error counts

    Returns:
        Array of error rates (0-1)
    """
    error_rates = []
    for m in request_metrics:
        total = m.get("total", 0)
        errors = m.get("errors", 0)
        error_rate = errors / total if total > 0 else 0.0
        error_rates.append(error_rate)

    return np.array(error_rates) if error_rates else np.array([0.0])


# Example usage
if __name__ == "__main__":
    # Set up logging
    logging.basicConfig(level=logging.INFO)

    # Create service
    service = ForecastingService()

    # Generate synthetic historical data
    np.random.seed(42)
    historical_data = np.cumsum(np.random.randn(100)) + 100
    historical_data = np.maximum(historical_data, 0)  # Ensure non-negative

    # Generate forecast
    result = service.generate_forecast(
        signal_type="event_count",
        entity_id="auth_service",
        historical_data=historical_data,
        horizon="24h",
        confidence_level=0.95,
        model_type="arima"
    )

    print(f"\nForecast generated at: {result.generated_at}")
    print(f"Signal: {result.signal_type}, Entity: {result.entity_id}")
    print(f"Horizon: {result.forecast_horizon}")
    print(f"Model: {result.model_info.type}")
    print(f"Accuracy - MAPE: {result.model_info.accuracy_metrics.mape:.2f}%")
    print(f"Accuracy - RMSE: {result.model_info.accuracy_metrics.rmse:.2f}")
    print(f"\nFirst 5 forecast points:")
    for i, fp in enumerate(result.forecasts[:5]):
        print(
            f"  {fp.timestamp.strftime('%Y-%m-%d %H:%M')}: "
            f"{fp.predicted_value:.2f} "
            f"[{fp.lower_bound:.2f}, {fp.upper_bound:.2f}] "
            f"({fp.confidence*100:.0f}% confidence)"
        )
