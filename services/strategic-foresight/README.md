# Strategic Foresight AI Suite

AI-driven predictive analytics and scenario planning service for strategic decision-making.

## Overview

This service provides comprehensive strategic foresight capabilities:

- **Market Trend Predictions** - Identify emerging trends across technology, regulatory, and market domains
- **Competitive Threat Analysis** - Monitor and assess competitive threats with confidence scoring
- **Partnership Opportunities** - Discover strategic partnership opportunities with fit analysis
- **Scenario Planning** - Generate strategic scenarios with probability assessments
- **Pivot Analysis** - Evaluate pivot opportunities with feasibility scoring
- **Strategic Recommendations** - AI-generated prescriptive recommendations

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/metrics` | GET | Prometheus metrics |
| `/analyze` | POST | Comprehensive foresight analysis |
| `/trends` | POST | Market trend predictions |
| `/threats` | POST | Competitive threat identification |
| `/partnerships` | POST | Partnership opportunities |
| `/scenarios` | POST | Scenario generation |
| `/pivots` | POST | Pivot opportunity analysis |

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app:app --reload --port 8003

# Run tests
pytest tests/ -v
```

## Docker

```bash
# Build
docker build -t strategic-foresight .

# Run
docker run -p 8003:8003 strategic-foresight
```

## Usage Example

```python
import httpx

# Comprehensive analysis
response = httpx.post("http://localhost:8003/analyze", json={
    "domain": "technology",
    "competitors": ["CompetitorA", "CompetitorB"],
    "time_horizon": "medium_term",
    "scenario_count": 3
})

analysis = response.json()
print(f"Executive Summary: {analysis['executive_summary']}")
print(f"Trends: {len(analysis['trends'])}")
print(f"Threats: {len(analysis['threats'])}")
```

## GraphQL Integration

Query via the IntelGraph GraphQL API:

```graphql
query {
  strategicForesight(input: {
    domain: "technology"
    competitors: ["CompetitorA"]
    timeHorizon: MEDIUM_TERM
  }) {
    analysisId
    executiveSummary
    trends {
      title
      confidence
      impactScore
    }
    threats {
      competitor
      threatLevel
    }
    recommendations {
      title
      priority
    }
  }
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8003 | Service port |
| `REDIS_URL` | - | Redis URL for caching |

## Metrics

Prometheus metrics available at `/metrics`:

- `strategic_foresight_requests_total` - Request counts by endpoint
- `strategic_foresight_request_duration_seconds` - Request latency
- `strategic_foresight_predictions_total` - Prediction counts by type
