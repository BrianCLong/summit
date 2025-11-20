# Predictive Threat Suite (Alpha) - Architecture

## Overview

The Predictive Threat Suite provides timeline forecasting and counterfactual simulation capabilities integrated with Summit's observability infrastructure (Prometheus, Grafana).

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Data Sources & Ingestion                      │
├─────────────────────────────────────────────────────────────────┤
│  • Prometheus Time Series (HTTP metrics, DB latency, errors)    │
│  • Event Streams (security events, user actions, system events) │
│  • Historical Data (PostgreSQL/TimescaleDB)                      │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────────────────────┐
│              Predictive Threat Suite Services                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Timeline Forecasting Service (Port 8091)                │   │
│  │  • ARIMA/Prophet/Exponential Smoothing models           │   │
│  │  • Confidence bands (80%, 95%)                          │   │
│  │  • Multi-horizon forecasts (1h, 6h, 24h, 7d)           │   │
│  │  • Signal types: event counts, latency, error rates     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Counterfactual Simulator Service (Port 8092)           │   │
│  │  • Scenario modeling with causal inference              │   │
│  │  • Intervention impact quantification                   │   │
│  │  • What-if analysis for threat responses                │   │
│  │  • Risk mitigation simulations                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Metrics Aggregator Service (Port 8093)                 │   │
│  │  • Collects forecasts and simulations                   │   │
│  │  • Exposes /metrics endpoint for Prometheus             │   │
│  │  • Tracks prediction accuracy over time                 │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────────────────────┐
│                  Observability Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  • Prometheus: Scrapes /metrics every 15s                        │
│  • Grafana Dashboards:                                           │
│    - Platform Health SLO (p95 latency, ingest E2E, errors)     │
│    - Predictive Outputs (forecast curves + confidence bands)    │
│  • AlertManager: Forecast-based alerts                          │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Forecasting Pipeline

```
Historical Metrics → Feature Engineering → Model Selection → Forecast Generation → Confidence Intervals → Prometheus Metrics
```

### 2. Counterfactual Pipeline

```
Current State → Scenario Definition → Intervention Modeling → Causal Simulation → Impact Assessment → Dashboard Visualization
```

## API Endpoints

### Timeline Forecasting Service (Port 8091)

```typescript
POST /api/forecast
{
  "signal_type": "event_count" | "latency_p95" | "error_rate",
  "entity_id": "string",
  "horizon": "1h" | "6h" | "24h" | "7d",
  "confidence_level": 0.80 | 0.95,
  "historical_window": "30d"
}

Response:
{
  "signal_type": "event_count",
  "entity_id": "auth_service",
  "forecast_horizon": "24h",
  "generated_at": "2025-11-20T10:00:00Z",
  "forecasts": [
    {
      "timestamp": "2025-11-20T11:00:00Z",
      "predicted_value": 1250.5,
      "lower_bound": 1100.2,
      "upper_bound": 1400.8,
      "confidence": 0.95
    },
    // ... more forecast points
  ],
  "model_info": {
    "type": "arima",
    "parameters": {"p": 2, "d": 1, "q": 2},
    "accuracy_metrics": {
      "mape": 0.087,
      "rmse": 45.2
    }
  }
}

GET /api/forecasts?entity_id=auth_service&signal_type=event_count
GET /metrics (Prometheus format)
GET /health
```

### Counterfactual Simulator Service (Port 8092)

```typescript
POST /api/simulate
{
  "scenario": {
    "entity_id": "auth_service",
    "current_state": {
      "threat_level": "high",
      "error_rate": 0.05,
      "latency_p95": 450
    },
    "timeframe": "24h"
  },
  "interventions": [
    {
      "type": "deploy_patch",
      "timing": "immediate",
      "parameters": {"rollout_percentage": 50}
    },
    {
      "type": "rate_limit",
      "timing": "2h",
      "parameters": {"limit": 1000}
    }
  ]
}

Response:
{
  "scenario_id": "uuid",
  "baseline_outcome": {
    "threat_escalation_probability": 0.75,
    "expected_error_rate": 0.08,
    "expected_latency_p95": 650
  },
  "intervention_outcomes": [
    {
      "intervention_id": "deploy_patch",
      "probability": 0.85,
      "impact": {
        "threat_escalation_probability": 0.15,
        "expected_error_rate": 0.01,
        "expected_latency_p95": 350,
        "risk_reduction": 0.60
      },
      "confidence": 0.92
    }
  ],
  "recommendation": {
    "action": "deploy_patch",
    "priority": "high",
    "reasoning": "60% risk reduction with 92% confidence"
  }
}

GET /api/simulations?entity_id=auth_service
GET /metrics
GET /health
```

### Metrics Aggregator Service (Port 8093)

```
GET /metrics

# Prometheus metrics exposed:
predictive_forecast_value{signal_type="event_count", entity_id="auth_service", horizon="24h"} 1250.5
predictive_forecast_lower_bound{signal_type="event_count", entity_id="auth_service", horizon="24h"} 1100.2
predictive_forecast_upper_bound{signal_type="event_count", entity_id="auth_service", horizon="24h"} 1400.8
predictive_forecast_accuracy{signal_type="event_count", entity_id="auth_service", metric="mape"} 0.087
predictive_simulation_risk_score{scenario_id="uuid", entity_id="auth_service"} 0.15
predictive_simulation_confidence{scenario_id="uuid", entity_id="auth_service"} 0.92
```

## Key Metrics Tracked

### Platform Health SLOs

1. **Query Latency**: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`
2. **Ingest E2E Time**: `histogram_quantile(0.95, rate(ingest_pipeline_duration_seconds_bucket[5m]))`
3. **Error Rate**: `rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])`
4. **Database Performance**: `histogram_quantile(0.95, rate(postgres_query_duration_seconds_bucket[5m]))`

### Predictive Outputs

1. **Forecast Values**: Time series of predicted values with confidence bands
2. **Forecast Accuracy**: MAPE (Mean Absolute Percentage Error), RMSE
3. **Simulation Risk Scores**: 0-1 scale risk after interventions
4. **Prediction Drift**: Difference between predicted vs actual over time

## Configuration

### Prometheus Scrape Config

```yaml
scrape_configs:
  - job_name: 'predictive-suite'
    scrape_interval: 15s
    static_configs:
      - targets:
        - 'predictive-forecasting:8091'
        - 'predictive-simulator:8092'
        - 'predictive-metrics:8093'
```

### Feature Flags

- `predictive_suite.forecasting.enabled`: Enable/disable forecasting
- `predictive_suite.counterfactual.enabled`: Enable/disable simulation
- `predictive_suite.auto_refresh_interval`: How often to regenerate forecasts (default: 15m)

## Minimal Alpha Feature Set

For the alpha release, we focus on:

1. **Single Signal Type Forecasting**: Event count forecasting with 24h horizon
2. **Simple Counterfactual**: Binary intervention (deploy_patch vs do_nothing)
3. **Core Metrics**: p95 latency, error rate, ingest E2E time
4. **Two Dashboards**: Platform Health SLO + Predictive Forecasts

## Technology Stack

- **Forecasting**: Python (using existing packages/forecasting/ with ARIMA, Prophet)
- **API Layer**: FastAPI (Python) or Express.js (Node.js)
- **Metrics Export**: prometheus_client (Python) or prom-client (Node.js)
- **Storage**: TimescaleDB for historical time series
- **Deployment**: Docker Compose + Kubernetes Helm charts

## Security & Performance

- Rate limiting: 100 requests/minute per service
- Authentication: API keys or service mesh mTLS
- Forecast cache: 15-minute TTL
- Historical data retention: 90 days
- Max forecast horizon: 30 days

## Testing Strategy

1. **Unit Tests**: Model accuracy, confidence interval calculations
2. **Integration Tests**: End-to-end forecast generation and metrics export
3. **Performance Tests**: Latency under load (target: p95 < 500ms)
4. **Accuracy Tests**: Backtesting on historical data (target: MAPE < 15%)

## Deployment

```bash
# Docker Compose
docker-compose -f docker-compose.predictive-suite.yml up -d

# Kubernetes
helm install predictive-suite ./helm/predictive-suite -n observability
```

## Future Enhancements (Post-Alpha)

- Multi-variate forecasting (multiple signals simultaneously)
- Automated model selection and hyperparameter tuning
- Real-time anomaly detection integration
- Causal graph learning from historical data
- Quantum-enhanced prediction (integration with PredictiveIntelligenceEngine)
