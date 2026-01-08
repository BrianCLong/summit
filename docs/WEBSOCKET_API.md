# WebSocket API Documentation

The Summit platform uses Socket.io to provide real-time capabilities for Investigation Collaboration and Maestro Agent Execution.

## Connection

Connect to the `/realtime` namespace. Authentication is handled via JWT token in the `auth` payload or `Authorization` header.

```javascript
import { io } from "socket.io-client";

const socket = io("https://api.summit.com/realtime", {
  auth: {
    token: "YOUR_JWT_TOKEN",
  },
});
```

### Connection Features

- **Auto-reconnection**: Built-in with exponential backoff.
- **Heartbeats**: Maintained automatically by Socket.io (`pingInterval`, `pingTimeout`).
- **Load Balancing**: Support for sticky sessions and Redis adapter for horizontal scaling.

## Maestro Agent Execution

Real-time updates for agent runs, logs, and status changes.

### Subscribe to Run Updates

Listen for progress and state changes for a specific run.

**Emit**: `maestro:subscribe_run`
**Payload**: `{ "runId": "string" }`

**Event**: `maestro:run_update`
**Payload**:

```json
{
  "runId": "string",
  "status": "RUNNING" | "COMPLETED" | "FAILED",
  "progress": 0.5,
  "timestamp": 1234567890
}
```

### Subscribe to Logs

Stream live logs from an agent execution.

**Emit**: `maestro:subscribe_logs`
**Payload**: `{ "runId": "string" }`

**Event**: `maestro:log`
**Payload**:

```json
{
  "runId": "string",
  "entry": {
    "level": "info",
    "message": "Processing step 1...",
    "timestamp": "2023-10-27T10:00:00Z"
  },
  "timestamp": 1234567890
}
```

### Subscribe to Global Status

Receive status updates for all visible runs (e.g., for a dashboard view).

**Emit**: `maestro:subscribe_status`
**Payload**: `null`

**Event**: `maestro:status_update`
**Payload**:

```json
{
  "runId": "string",
  "status": "COMPLETED",
  "timestamp": 1234567890
}
```

## Investigation Collaboration

(Existing functionality maintained)

- **Presence**: `presence:update`
- **Annotations**: `annotation:add`, `annotation:update`, `annotation:delete`
- **Comments**: `comment:add`, `comment:update`, `comment:delete`
- **Graph Sync**: Real-time collaborative graph editing via Y.js/CRDT.

## Error Handling

Errors are emitted via standard `error` event or specific namespaced error events.

**Event**: `maestro:error`
**Payload**:

```json
{
  "code": "SUBSCRIPTION_FAILED",
  "message": "Failed to subscribe to run"
}
```
