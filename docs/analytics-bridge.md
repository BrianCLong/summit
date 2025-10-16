# Analytics Bridge – Redis Streams → Socket.IO

This component streams progressive analytics results from Redis Streams to the Advanced Graph UI via Socket.IO.

## Overview

- Consumes Redis Stream `analytics:results` using a consumer group for durability.
- Creates Socket.IO namespace `/graph-analytics`.
- Clients join rooms keyed by `jobId` and receive events:
  - `progress`: task progress messages
  - `result`: task result chunks
  - `error`: error messages
  - `complete`: job completion

## Files

- `server/src/realtime/analyticsBridge.js`: Bridge implementation.
- `server/server.js`: Initializes the namespace and starts the bridge.
- `server/tests/analyticsBridge.int.test.js`: Integration test using Testcontainers (Redis).

## Env Vars

- `REDIS_URL` (default `redis://localhost:6379/1`)
- `ANALYTICS_RESULTS_STREAM` (default `analytics:results`)
- `ANALYTICS_RESULTS_GROUP` (default `analytics-bridge`)

## Client Usage

```js
// connect to namespace and join a job room
const socket = io('/graph-analytics', { auth: { token } });
socket.emit('join_job', { jobId: job.id });

socket.on('progress', (e) => {
  /* update UI */
});
socket.on('result', (e) => {
  /* append partial results */
});
socket.on('error', (e) => {
  /* show error */
});
socket.on('complete', (e) => {
  /* finalize */
});
```

## Notes

- Messages are acknowledged on consumption to avoid redelivery.
- If no `job_id` is present, the bridge broadcasts to all clients in the namespace.
- The bridge does not crash on parse errors; invalid messages are acked and logged.
