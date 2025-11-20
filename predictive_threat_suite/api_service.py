"""
Predictive Threat Suite - API Service

FastAPI service exposing forecasting and counterfactual simulation endpoints
with Prometheus metrics integration.
"""

import logging
from datetime import datetime
from typing import Any, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel, Field
from prometheus_client import (
    Counter,
    Histogram,
    Gauge,
    generate_latest,
    CollectorRegistry,
    CONTENT_TYPE_LATEST
)
import numpy as np

from forecasting_service import (
    ForecastingService,
    SignalType,
    ForecastHorizon,
    ModelType,
    prepare_event_count_data,
    prepare_latency_data,
    prepare_error_rate_data,
)
from counterfactual_service import (
    CounterfactualService,
    ThreatLevel,
    InterventionType,
    CurrentState,
    InterventionParameters,
)

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Prometheus metrics registry
registry = CollectorRegistry()

# Request metrics
http_requests_total = Counter(
    'predictive_http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status'],
    registry=registry
)

http_request_duration_seconds = Histogram(
    'predictive_http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint'],
    registry=registry
)

# Forecast metrics
forecast_generation_total = Counter(
    'predictive_forecast_generation_total',
    'Total forecasts generated',
    ['signal_type', 'model_type', 'status'],
    registry=registry
)

forecast_generation_duration_seconds = Histogram(
    'predictive_forecast_generation_duration_seconds',
    'Forecast generation duration in seconds',
    ['signal_type', 'model_type'],
    registry=registry
)

forecast_accuracy_mape = Gauge(
    'predictive_forecast_accuracy_mape',
    'Forecast accuracy - Mean Absolute Percentage Error',
    ['signal_type', 'entity_id', 'model_type'],
    registry=registry
)

forecast_accuracy_rmse = Gauge(
    'predictive_forecast_accuracy_rmse',
    'Forecast accuracy - Root Mean Square Error',
    ['signal_type', 'entity_id', 'model_type'],
    registry=registry
)

# Prediction value metrics (for dashboards)
forecast_predicted_value = Gauge(
    'predictive_forecast_value',
    'Latest forecast predicted value',
    ['signal_type', 'entity_id', 'horizon', 'offset_hours'],
    registry=registry
)

forecast_lower_bound = Gauge(
    'predictive_forecast_lower_bound',
    'Latest forecast lower confidence bound',
    ['signal_type', 'entity_id', 'horizon', 'offset_hours'],
    registry=registry
)

forecast_upper_bound = Gauge(
    'predictive_forecast_upper_bound',
    'Latest forecast upper confidence bound',
    ['signal_type', 'entity_id', 'horizon', 'offset_hours'],
    registry=registry
)

# Simulation metrics
simulation_total = Counter(
    'predictive_simulation_total',
    'Total simulations run',
    ['entity_id', 'status'],
    registry=registry
)

simulation_duration_seconds = Histogram(
    'predictive_simulation_duration_seconds',
    'Simulation duration in seconds',
    ['entity_id'],
    registry=registry
)

simulation_risk_score = Gauge(
    'predictive_simulation_risk_score',
    'Latest simulation risk score',
    ['entity_id', 'scenario_type'],
    registry=registry
)

simulation_recommendation_priority = Gauge(
    'predictive_simulation_recommendation_priority',
    'Simulation recommendation priority (0=low, 1=medium, 2=high, 3=critical)',
    ['entity_id', 'recommended_action'],
    registry=registry
)


# Pydantic models for API
class ForecastRequest(BaseModel):
    """Request model for forecast generation."""
    signal_type: SignalType
    entity_id: str
    historical_data: list[float] = Field(
        ...,
        description="Historical time series data points"
    )
    horizon: ForecastHorizon = "24h"
    confidence_level: float = Field(0.95, ge=0.5, le=0.99)
    model_type: ModelType = "arima"


class ForecastPointResponse(BaseModel):
    """Response model for a single forecast point."""
    timestamp: datetime
    predicted_value: float
    lower_bound: float
    upper_bound: float
    confidence: float


class ModelMetricsResponse(BaseModel):
    """Response model for model accuracy metrics."""
    mape: float
    rmse: float
    mae: float
    r_squared: float


class ModelInfoResponse(BaseModel):
    """Response model for model information."""
    type: ModelType
    parameters: dict[str, Any]
    accuracy_metrics: ModelMetricsResponse


class ForecastResponse(BaseModel):
    """Response model for forecast generation."""
    signal_type: SignalType
    entity_id: str
    forecast_horizon: ForecastHorizon
    generated_at: datetime
    forecasts: list[ForecastPointResponse]
    model_info: ModelInfoResponse


class SimulationRequest(BaseModel):
    """Request model for counterfactual simulation."""
    entity_id: str
    current_state: dict[str, Any] = Field(
        ...,
        description="Current system state with threat_level, error_rate, latency_p95, etc."
    )
    interventions: list[dict[str, Any]] = Field(
        ...,
        description="List of interventions to simulate"
    )
    timeframe: str = "24h"


class OutcomeMetricsResponse(BaseModel):
    """Response model for outcome metrics."""
    threat_escalation_probability: float
    expected_error_rate: float
    expected_latency_p95: float
    expected_availability: float
    risk_reduction: float


class InterventionOutcomeResponse(BaseModel):
    """Response model for intervention outcome."""
    intervention_id: str
    intervention_type: InterventionType
    probability: float
    impact: OutcomeMetricsResponse
    confidence: float
    cost_estimate: float
    time_to_effect: int


class RecommendationResponse(BaseModel):
    """Response model for recommendation."""
    action: InterventionType
    priority: str
    reasoning: str
    expected_benefit: float


class SimulationResponse(BaseModel):
    """Response model for simulation."""
    scenario_id: str
    entity_id: str
    generated_at: datetime
    baseline_outcome: OutcomeMetricsResponse
    intervention_outcomes: list[InterventionOutcomeResponse]
    recommendation: RecommendationResponse


# Service instances
forecasting_service: Optional[ForecastingService] = None
counterfactual_service: Optional[CounterfactualService] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup."""
    global forecasting_service, counterfactual_service

    logger.info("Starting Predictive Threat Suite API Service...")

    forecasting_service = ForecastingService()
    counterfactual_service = CounterfactualService()

    logger.info("Services initialized successfully")

    yield

    logger.info("Shutting down Predictive Threat Suite API Service...")


# Create FastAPI app
app = FastAPI(
    title="Predictive Threat Suite API",
    description="Timeline forecasting and counterfactual simulation for threat intelligence",
    version="0.1.0-alpha",
    lifespan=lifespan
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "Predictive Threat Suite API",
        "version": "0.1.0-alpha",
        "status": "operational",
        "endpoints": {
            "forecast": "/api/forecast",
            "simulate": "/api/simulate",
            "metrics": "/metrics",
            "health": "/health"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "forecasting": forecasting_service is not None,
            "simulation": counterfactual_service is not None
        }
    }


@app.post("/api/forecast", response_model=ForecastResponse)
async def generate_forecast(request: ForecastRequest):
    """
    Generate a time series forecast with confidence intervals.

    This endpoint takes historical data and generates predictions for a specified
    time horizon using various forecasting models (ARIMA, Exponential Smoothing).
    """
    start_time = datetime.utcnow()

    try:
        logger.info(
            f"Generating forecast for {request.entity_id} "
            f"({request.signal_type}) with model {request.model_type}"
        )

        # Convert to numpy array
        historical_data = np.array(request.historical_data)

        # Generate forecast
        with forecast_generation_duration_seconds.labels(
            signal_type=request.signal_type,
            model_type=request.model_type
        ).time():
            result = forecasting_service.generate_forecast(
                signal_type=request.signal_type,
                entity_id=request.entity_id,
                historical_data=historical_data,
                horizon=request.horizon,
                confidence_level=request.confidence_level,
                model_type=request.model_type
            )

        # Update metrics
        forecast_generation_total.labels(
            signal_type=request.signal_type,
            model_type=request.model_type,
            status="success"
        ).inc()

        forecast_accuracy_mape.labels(
            signal_type=request.signal_type,
            entity_id=request.entity_id,
            model_type=request.model_type
        ).set(result.model_info.accuracy_metrics.mape)

        forecast_accuracy_rmse.labels(
            signal_type=request.signal_type,
            entity_id=request.entity_id,
            model_type=request.model_type
        ).set(result.model_info.accuracy_metrics.rmse)

        # Update forecast value metrics (for Grafana dashboards)
        for i, forecast_point in enumerate(result.forecasts):
            offset_hours = i + 1

            forecast_predicted_value.labels(
                signal_type=request.signal_type,
                entity_id=request.entity_id,
                horizon=request.horizon,
                offset_hours=str(offset_hours)
            ).set(forecast_point.predicted_value)

            forecast_lower_bound.labels(
                signal_type=request.signal_type,
                entity_id=request.entity_id,
                horizon=request.horizon,
                offset_hours=str(offset_hours)
            ).set(forecast_point.lower_bound)

            forecast_upper_bound.labels(
                signal_type=request.signal_type,
                entity_id=request.entity_id,
                horizon=request.horizon,
                offset_hours=str(offset_hours)
            ).set(forecast_point.upper_bound)

        # Record request
        duration = (datetime.utcnow() - start_time).total_seconds()
        http_requests_total.labels(
            method="POST",
            endpoint="/api/forecast",
            status="200"
        ).inc()

        http_request_duration_seconds.labels(
            method="POST",
            endpoint="/api/forecast"
        ).observe(duration)

        # Convert to response model
        return ForecastResponse(
            signal_type=result.signal_type,
            entity_id=result.entity_id,
            forecast_horizon=result.forecast_horizon,
            generated_at=result.generated_at,
            forecasts=[
                ForecastPointResponse(
                    timestamp=fp.timestamp,
                    predicted_value=fp.predicted_value,
                    lower_bound=fp.lower_bound,
                    upper_bound=fp.upper_bound,
                    confidence=fp.confidence
                )
                for fp in result.forecasts
            ],
            model_info=ModelInfoResponse(
                type=result.model_info.type,
                parameters=result.model_info.parameters,
                accuracy_metrics=ModelMetricsResponse(
                    mape=result.model_info.accuracy_metrics.mape,
                    rmse=result.model_info.accuracy_metrics.rmse,
                    mae=result.model_info.accuracy_metrics.mae,
                    r_squared=result.model_info.accuracy_metrics.r_squared
                )
            )
        )

    except Exception as e:
        logger.error(f"Error generating forecast: {str(e)}", exc_info=True)

        forecast_generation_total.labels(
            signal_type=request.signal_type,
            model_type=request.model_type,
            status="error"
        ).inc()

        http_requests_total.labels(
            method="POST",
            endpoint="/api/forecast",
            status="500"
        ).inc()

        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/simulate", response_model=SimulationResponse)
async def run_simulation(request: SimulationRequest):
    """
    Run a counterfactual simulation for threat scenarios.

    This endpoint simulates different intervention strategies and predicts
    their outcomes, providing recommendations for threat mitigation.
    """
    start_time = datetime.utcnow()

    try:
        logger.info(
            f"Running simulation for {request.entity_id} "
            f"with {len(request.interventions)} interventions"
        )

        # Parse current state
        state = CurrentState(
            threat_level=ThreatLevel(request.current_state["threat_level"]),
            error_rate=request.current_state.get("error_rate", 0.0),
            latency_p95=request.current_state.get("latency_p95", 0.0),
            request_rate=request.current_state.get("request_rate", 100.0),
            resource_utilization=request.current_state.get("resource_utilization", 0.7)
        )

        # Parse interventions
        interventions = [
            InterventionParameters(
                type=InterventionType(i["type"]),
                timing=i.get("timing", "immediate"),
                parameters=i.get("parameters", {})
            )
            for i in request.interventions
        ]

        # Run simulation
        with simulation_duration_seconds.labels(
            entity_id=request.entity_id
        ).time():
            result = counterfactual_service.simulate_scenario(
                entity_id=request.entity_id,
                current_state=state,
                interventions=interventions,
                timeframe=request.timeframe
            )

        # Update metrics
        simulation_total.labels(
            entity_id=request.entity_id,
            status="success"
        ).inc()

        simulation_risk_score.labels(
            entity_id=request.entity_id,
            scenario_type="baseline"
        ).set(result.baseline_outcome.threat_escalation_probability)

        # Priority mapping
        priority_map = {"low": 0, "medium": 1, "high": 2, "critical": 3}
        simulation_recommendation_priority.labels(
            entity_id=request.entity_id,
            recommended_action=result.recommendation.action.value
        ).set(priority_map.get(result.recommendation.priority, 0))

        # Record request
        duration = (datetime.utcnow() - start_time).total_seconds()
        http_requests_total.labels(
            method="POST",
            endpoint="/api/simulate",
            status="200"
        ).inc()

        http_request_duration_seconds.labels(
            method="POST",
            endpoint="/api/simulate"
        ).observe(duration)

        # Convert to response model
        return SimulationResponse(
            scenario_id=result.scenario_id,
            entity_id=result.entity_id,
            generated_at=result.generated_at,
            baseline_outcome=OutcomeMetricsResponse(
                threat_escalation_probability=result.baseline_outcome.threat_escalation_probability,
                expected_error_rate=result.baseline_outcome.expected_error_rate,
                expected_latency_p95=result.baseline_outcome.expected_latency_p95,
                expected_availability=result.baseline_outcome.expected_availability,
                risk_reduction=result.baseline_outcome.risk_reduction
            ),
            intervention_outcomes=[
                InterventionOutcomeResponse(
                    intervention_id=io.intervention_id,
                    intervention_type=io.intervention_type,
                    probability=io.probability,
                    impact=OutcomeMetricsResponse(
                        threat_escalation_probability=io.impact.threat_escalation_probability,
                        expected_error_rate=io.impact.expected_error_rate,
                        expected_latency_p95=io.impact.expected_latency_p95,
                        expected_availability=io.impact.expected_availability,
                        risk_reduction=io.impact.risk_reduction
                    ),
                    confidence=io.confidence,
                    cost_estimate=io.cost_estimate,
                    time_to_effect=io.time_to_effect
                )
                for io in result.intervention_outcomes
            ],
            recommendation=RecommendationResponse(
                action=result.recommendation.action,
                priority=result.recommendation.priority,
                reasoning=result.recommendation.reasoning,
                expected_benefit=result.recommendation.expected_benefit
            )
        )

    except Exception as e:
        logger.error(f"Error running simulation: {str(e)}", exc_info=True)

        simulation_total.labels(
            entity_id=request.entity_id,
            status="error"
        ).inc()

        http_requests_total.labels(
            method="POST",
            endpoint="/api/simulate",
            status="500"
        ).inc()

        raise HTTPException(status_code=500, detail=str(e))


@app.get("/metrics")
async def metrics():
    """
    Prometheus metrics endpoint.

    Exposes metrics in Prometheus format for scraping.
    """
    return Response(
        content=generate_latest(registry),
        media_type=CONTENT_TYPE_LATEST
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8091,
        log_level="info"
    )
