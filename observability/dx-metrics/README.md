# Developer Experience Telemetry Pipeline

## Purpose
Capture friction, satisfaction, and workflow telemetry from CLI/UI interactions to drive continuous improvement.

## Data Flow
1. **Event Emitters** – CLI plugins and web portal copilot emit `DxEvent` payloads (command, durationMs, outcome, satisfaction, metadata).
2. **Ingestion** – Events forwarded to OTEL collector (`observability/otel-collector-config.yaml`) via gRPC exporter `dx-metrics` pipeline.
3. **Processing** – Grafana dashboards aggregate golden path adoption, failure hotspots, and NPS-style satisfaction trends.
4. **Feedback Loop** – Insights feed backlog via weekly DX council reviews; improvements tracked in `docs/modules/devexp`.

## Schema
```
type DxEvent = {
  id: string;
  persona: 'feature-dev' | 'platform-engineer' | 'sre';
  channel: 'cli' | 'ui' | 'chatops';
  command: string;
  durationMs: number;
  success: boolean;
  frictionTags: string[];
  satisfactionScore?: number;
  knowledgeGraphRefs: string[];
  timestamp: string;
};
```

## Alerts
- **High Failure Rate:** Trigger when rolling 1h failure ratio > 0.25 for any golden path command.
- **Low Satisfaction:** Alert when satisfaction score drops below 3.5 for two consecutive hours.
- **Telemetry Drop:** Notify if event volume decreases by 40% vs. weekly baseline.

## Ownership
- DX Platform Squad owns instrumentation.
- SRE Observability Guild maintains pipelines and dashboards.
