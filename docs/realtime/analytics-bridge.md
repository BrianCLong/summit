# Realtime Analytics Bridge (Redis Streams → Socket.IO)

This component streams partial analytics results and AI insights from Redis Streams to the Advanced Graph UI over Socket.IO.

## Overview

- Namespace: `/graph-analytics`
- Rooms: `job:{jobId}` for analytics runs; UI joins via `join_job`
- Events: `progress`, `result`, `error`, `complete`
- Stream: Redis Stream `analytics:results` with consumer group

## Files

- `server/src/realtime/analyticsBridge.js` – Redis → Socket.IO bridge
- `server/src/realtime/socket.js` – General realtime namespace (`/realtime`, e.g., `ai:entity:{id}`)
- `server/server.js` – Initializes Socket.IO and starts the bridge

## Environment

- `REDIS_URL` (e.g., `redis://localhost:6379/1`)
- `ANALYTICS_RESULTS_STREAM` (default: `analytics:results`)
- `ANALYTICS_RESULTS_GROUP` (default: `analytics-bridge`)
- `DISABLE_SOCKET_AUTH=1` to bypass JWT auth on the namespace for local tests/dev

## How It Works

1. On server start, the bridge creates a consumer group on the stream (id `$`, `MKSTREAM`).
2. It reads entries with `XREADGROUP ... BLOCK 200 COUNT 64 STREAMS analytics:results >`.
3. Each message field `event` (JSON) is parsed and classified into one of the events above.
4. If `job_id` is present, it emits to `job:{job_id}`; else it broadcasts on the namespace.
5. Messages are acknowledged with `XACK` after successful emit; parse failures are logged and acked to prevent poison loops.

## Join Flow (Client)

```js
const socket = io('/graph-analytics', { auth: { token } });
socket.emit('join_job', { jobId });
socket.on('progress', (ev) => {
  /* update UI */
});
socket.on('result', (ev) => {
  /* append partial */
});
socket.on('error', (ev) => {
  /* show error */
});
socket.on('complete', (ev) => {
  /* finalize */
});
```

## Tests

- Integration test: `server/tests/analyticsBridge.int.test.js`
  - Uses Jest + Testcontainers (Redis) to publish synthetic `ProgressEvent`s to the stream and assert ordered socket deliveries.
  - To run locally:
    ```bash
    cd server
    npm i
    # optional but recommended: npm i -D testcontainers
    DISABLE_SOCKET_AUTH=1 npm test -- analyticsBridge.int.test.js
    ```

## Notes

- First packet latency target: ≤ 500ms; the bridge uses short blocking reads to minimize delay.
- The general AI insights flow (`ai:insight` to `ai:entity:{id}`) is handled by `server/src/workers/aiWorker.js` on the `/realtime` namespace.
