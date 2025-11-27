# Summitsight Analytics & Executive Intelligence Layer

## Overview

Summitsight is the "Executive Control Tower" for the Summit platform. It aggregates data from all subsystems (Maestro, IntelGraph, Securiteyes, etc.) into a unified analytics warehouse to provide strategic visibility.

It answers questions like:
- "How is the engineering team performing vs. SLAs?" (CTO)
- "What is our current security risk posture?" (CISO)
- "Are we profitable on a per-tenant basis?" (CEO/CFO)
- "What emerging threats or opportunities are visible in the data?" (Foresight)

## Architecture

### 1. Data Model (PostgreSQL)

The system uses a dedicated analytics schema (`summitsight_`) separate from the transactional tables.

- **Dimensions:** `summitsight_dim_tenant`, `summitsight_dim_agent`
- **Facts:** `summitsight_fact_runs`, `summitsight_fact_security`, `summitsight_fact_ops`
- **KPI Store:** `summitsight_kpi_registry` (definitions), `summitsight_kpi_values` (daily aggregations)

### 2. Services

- **ETL Service (`SummitsightETLService`):** Ingests raw events (streaming) and aggregates them into Facts.
- **KPI Engine (`KPIEngine`):** Calculates high-level metrics from Facts based on definitions.
- **Forecasting Engine (`ForecastingEngine`):** Uses statistical models (Linear Regression, etc.) to project future trends.
- **Correlation Engine (`CorrelationEngine`):** Identifies relationships between disparate datasets (e.g., Deployments vs. Incidents).
- **Risk Engine (`RiskEngine`):** Computes composite risk scores for tenants based on auth, data, and model usage.

### 3. API

Exposed at `/summitsight`:
- `GET /kpi`: List definitions
- `GET /exec-dashboard/:role`: Role-specific metric bundles
- `GET /warroom`: Real-time critical telemetry
- `GET /forecast/:kpiId`: Predictive data

### 4. Frontend

Located in `apps/web/src/summitsight/`:
- **Executive Dashboard:** Tabbed view for C-level personas.
- **War Room:** High-contrast, real-time crisis management view.
- **Forecasting View:** Visualizes projected trends.

## Usage

### Adding a New KPI

1. Add a definition to `summitsight_kpi_registry` (via SQL migration or admin UI).
2. Implement the calculator logic in `KPIEngine.computeAndStoreKPI`.
3. The dashboard will automatically pick it up if assigned to a role.

### War Room Mode

Access via `/warroom` in the frontend. This view is optimized for large screens in SOCs/NOCs.

## Future Work

- Integration with external ML service (Python) for advanced non-linear forecasting.
- Real-time alerting integration with PagerDuty/Slack.
