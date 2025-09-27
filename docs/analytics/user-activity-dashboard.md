# User Activity Analytics Dashboard

The User Activity Analytics Dashboard surfaces login and Copilot query trends for each tenant. Data flows from PostgreSQL through GraphQL and is visualised in the React client with Chart.js.

## GraphQL schema additions

Two new query fields expose aggregated activity data:

```graphql
userActivitySummary(
  tenantId: String
  rangeStart: DateTime
  rangeEnd: DateTime
): UserActivitySummary!

recentUserActivity(
  tenantId: String
  rangeStart: DateTime
  rangeEnd: DateTime
  limit: Int = 50
): [UserActivityEvent!]!
```

`UserActivitySummary` provides totals, a per-day breakdown, and the top users for the selected window. `recentUserActivity` returns raw audit events so the UI can show the latest interactions.

## Resolver behaviour

`UserActivityAnalyticsService` issues analytics SQL against `audit_events` and `nl_cypher_translations`. Each query runs inside an OpenTelemetry span with success/failure events so dashboards can be traced end-to-end. The service supports multiple audit table shapes by trying a primary query that filters by `tenant_id` and a fallback that relies on JSON metadata if legacy schemas are present.

Daily rollups combine login counts from `audit_events` and Copilot query counts from `nl_cypher_translations`. Top users are calculated by merging both sources. Recent activity is normalised so timestamps and metadata payloads are consistently formatted for the client.

## React dashboard

`UserActivityDashboard` uses Apollo Client to execute the new GraphQL query. The component renders:

- Summary cards for total logins, total queries, and unique users.
- A Chart.js line chart that overlays login and query counts per day.
- A bar chart ranking the top users.
- Tables for top users and the most recent events.

Users can toggle 7/30/90 day ranges and specify the tenant ID. The page route is available at `/analytics/user-activity` and is linked from the navigation drawer.

## Playwright coverage

`client/tests/e2e/user-activity-dashboard.spec.ts` stubs GraphQL responses to verify that the dashboard renders totals, charts, and recent activity rows without a live backend.

## Monitoring

Each resolver call emits OpenTelemetry spans tagged with the tenant, time window, and row counts. These events can be ingested by existing telemetry pipelines to monitor dashboard usage and data freshness.
