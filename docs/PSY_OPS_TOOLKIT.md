# Cognitive Security Toolkit (PsyOps Defense)

## Overview
The Cognitive Security Toolkit is a defense system designed to detect, analyze, and mitigate psychological influence operations in real-time. It integrates with the Red Team Simulation engine to provide a self-reinforcing loop of attack and defense.

## Architecture

### 1. Detection Engine (`DefensivePsyOpsService`)
- **Inputs**: Social media feeds, internal communications, `RedTeamSimulator` events.
- **Analysis**: Uses `ContentAnalyzer` (NLP) to score content for sentiment, manipulation, and virality.
- **Persistence**: Stores threats in `psyops_threats` and audit logs in `psyops_logs`.

### 2. Analysis Metrics
- **Sentiment Score**: (-1.0 to 1.0)
- **Manipulation Score**: (0.0 to 1.0) based on rhetorical patterns (urgency, exclusion, conspiracy).
- **Flags**: `HIGH_RISK_DISINFO`, `POTENTIAL_MANIPULATION`.

### 3. Integration
- Listens to `raw-event` on the global `eventBus`.
- Specifically targets `source: 'red-team'` events to validate detection logic against simulated attacks.

## API Endpoints

### `GET /api/psyops/threats`
Retrieve active threats.

### `POST /api/psyops/scan`
Manually scan content.
```json
{
  "content": "Urgent! Read this!",
  "source": "manual"
}
```

### `POST /api/psyops/threats/:id/resolve`
Resolve a threat with notes.

## Database Schema
- `psyops_threats`: The core entity tracking detected campaigns.
- `psyops_logs`: Immutable audit trail of detection events and state changes.
- `psyops_responses`: (Future) Tracking of deployed counter-narratives.

## Future Roadmap (Sprints 13-15)
- **Resilience Training**: Gamify the detected threats into user quizzes.
- **Counter-Influence**: Automate `psyops_responses` generation using LLMs.

## Deployment & Operations

### Deployment
1. Apply database migrations:
   ```bash
   npm run db:migrate
   ```
2. Ensure `REDIS_URL` and `POSTGRES_URL` are configured.
3. Start the server:
   ```bash
   npm start
   ```

### Performance Considerations
- **Simulation Scaling**: The current `SimulationService` runs on the main thread. For graphs exceeding 10,000 nodes, it is recommended to offload processing to a `Worker Thread` or external job queue (e.g., BullMQ).
- **NLP Analysis**: `ContentAnalyzer` uses heuristic regex matching (O(N)). Future integration with LLMs must handle latency (approx 500ms-2s) via async job queues.
- **Event Bus**: High-volume simulation events should be batched before persistence to avoid DB saturation.
