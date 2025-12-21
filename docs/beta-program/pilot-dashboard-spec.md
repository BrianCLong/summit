# Pilot Dashboard Spec

## Metrics to Track
1. **Usage**: Daily Active Users (DAU) on the beta feature.
2. **Errors**: Error rate for beta API endpoints.
3. **Time-to-Value**: Time from session start to successful outcome (e.g., successful graph query).
4. **Open Issues**: Count of open support tickets/issues.

## Implementation
- Frontend: `PilotDashboard.jsx` in `client/src/components`.
- Backend: Metrics served via `/api/metrics/pilot`.
