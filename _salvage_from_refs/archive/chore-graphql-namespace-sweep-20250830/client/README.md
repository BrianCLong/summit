Client Realtime Usage

Join AI Insights and Analytics Rooms

- AI insights (existing): connects to `/realtime` and joins `ai:entity:{id}`.
- Analytics progress (new): connects to `/graph-analytics` and joins `job:{jobId}`.

Example (Socket.IO client):

```js
import { io } from 'socket.io-client';

// General realtime (ai:insight)
const realtime = io(import.meta.env.VITE_WS_URL || 'http://localhost:4000/realtime', {
  transports: ['websocket'],
  auth: { token: localStorage.getItem('token') },
});

realtime.on('connect', () => {
  realtime.emit('join_ai_entity', { entityId: 'e123' });
});

realtime.on('ai:insight', (payload) => {
  // update AI panel
});

// Graph analytics progressive updates
const analytics = io(import.meta.env.VITE_WS_URL?.replace(/\/$/, '') + '/graph-analytics', {
  transports: ['websocket'],
  auth: { token: localStorage.getItem('token') },
});

analytics.on('connect', () => {
  analytics.emit('join_job', { jobId: 'job-123' });
});

analytics.on('progress', (ev) => { /* show in-progress */ });
analytics.on('result', (ev) => { /* append partial result */ });
analytics.on('error', (ev) => { /* display error */ });
analytics.on('complete', (ev) => { /* finalize */ });
```

Tip: In local dev or tests, you can bypass Socket.IO JWT auth on the analytics namespace by setting `DISABLE_SOCKET_AUTH=1` on the server.

Playwright E2E: Graph Analytics Stream

- Prereqs: Server running with `DISABLE_SOCKET_AUTH=1`, Redis up.
- Env (optional): `E2E_WS_URL` (default `http://localhost:4000`), `E2E_REDIS_URL` (default `redis://localhost:6379/1`).
- Run:

```bash
cd client
npm i
E2E_WS_URL=http://localhost:4000 E2E_REDIS_URL=redis://localhost:6379/1 \
  npm run test:e2e -- tests/e2e/analytics-bridge.spec.ts
```

---

For more details on client-side testing patterns, refer to [TESTING.md](TESTING.md).