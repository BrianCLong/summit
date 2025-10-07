# IntelGraph Orchestrator

The IntelGraph Orchestrator is a lightweight service that manages fastlane routing, friction alerts, and SLO compliance for the CI/CD pipeline.

## Features

- **Fastlane Routing**: Intelligent job routing for cacheable/expedited tasks
- **Friction Alerts**: Early detection of pipeline regressions with automatic rerouting
- **SLO Monitoring**: Real-time service level objective tracking and validation
- **Evidence Bundles**: Automated collection of compliance and audit evidence

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /fastlane/eligible` - Fastlane eligibility check
- `GET /friction/alert` - Friction alert detection
- `GET /metrics/slo` - SLO metrics reporting

## Configuration

The orchestrator can be configured using environment variables:

- `FASTLANE_ENABLED` - Enable/disable fastlane routing (default: false)
- `OTEL_EXPORTER_OTLP_ENDPOINT` - OpenTelemetry collector endpoint
- `PORT` - HTTP server port (default: 8000)

## Deployment

The orchestrator is deployed as part of the IntelGraph platform using Docker Compose:

```bash
docker-compose up -d orchestrator
```

## Integration

The orchestrator integrates with:
- GitHub Actions workflows for CI/CD pipeline optimization
- Prometheus/OpenTelemetry for metrics collection
- Grafana for dashboard visualization
- Alerting systems for friction notifications