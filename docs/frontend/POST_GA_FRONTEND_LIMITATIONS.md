# Post-GA Frontend Limitations & Guidance

This document provides factual, non-aspirational guidance for support, sales,
and demo use of the Summit frontend.

## What the UI Does

- Presents operational dashboards and investigation workflows for Summit.
- Surfaces live and historical telemetry when backend endpoints are available.
- Displays modeled forecasts when the forecasting endpoint responds.

## What the UI Explicitly Does Not Do

- It does **not** convert modeled forecasts into observed metrics.
- It does **not** infer missing data; gaps are surfaced as warnings.
- It does **not** guarantee real-time updates if the proxy or stream endpoints
  are unavailable.

## Modeled / Forecasted Data

- Forecast views are labeled **“Modeled forecast”** and described as estimates.
- Confidence bounds are displayed as lines and should not be treated as ground truth.

## Demo Mode

- When `VITE_DEMO_MODE` is enabled, a persistent banner states:
  **“DEMO MODE - Data shown is for demonstration purposes only.”**
- Demo mode content must not be represented as live production data.

## Support & Sales Guidance

- Use the forecast screen to explain modeled trends, not verified outcomes.
- If warnings indicate unavailable telemetry, avoid quoting metrics as definitive.
- For demos, confirm whether `VITE_DEMO_MODE` is enabled before presenting.
