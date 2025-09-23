import ws from 'k6/ws';
import { Trend, check, sleep } from 'k6';
import http from 'k6/http';

// k6 load test for end-to-end alert latency.

export const options = {
  vus: 20,
  duration: '3m',
  thresholds: {
    'alert_e2e_ms': ['p(95)<2500'], // p95 latency must be below 2.5 seconds
  },
};

const e2eLatencyTrend = new Trend('alert_e2e_ms');

export default function () {
  const baseUrl = __ENV.WEB_URL || 'http://localhost:3001';
  const apiUrl = `${baseUrl}/api/dev/emit-alert`;
  const wsUrl = `${baseUrl.replace('http', 'ws')}/ws`;

  // 1. Emit a synthetic alert via a special dev endpoint.
  // This endpoint should be disabled in production.
  const correlationId = `k6-${__VU}-${__ITER}-${Date.now()}`;
  const eventTimestamp = new Date().toISOString();
  
  const emitRes = http.post(apiUrl, JSON.stringify({
    correlation_id: correlationId,
    event_ts: eventTimestamp,
    title: `k6 latency test ${correlationId}`,
    severity: 'low'
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(emitRes, { 'alert emitter returned 200': (r) => r.status === 200 });

  // 2. Connect to WebSocket and wait for the alert to be rendered.
  // Measure the time from when the alert was sent to when it's received on the client.
  const res = ws.connect(wsUrl, {}, function (socket) {
    const startTime = new Date(eventTimestamp).getTime();

    socket.on('open', () => console.log(`VU ${__VU}: WebSocket connected`));

    socket.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        // Check if the received message is the alert we sent.
        if (msg.correlation_id === correlationId && msg.event === 'ALERT_RAISED') {
          const endTime = Date.now();
          const latency = endTime - startTime;
          e2eLatencyTrend.add(latency);
          console.log(`VU ${__VU}: Received alert ${correlationId}, latency: ${latency}ms`);
          socket.close();
        }
      } catch (e) {
        console.error(`VU ${__VU}: Error parsing WebSocket message: ${e}`);
      }
    });

    socket.on('close', () => console.log(`VU ${__VU}: WebSocket disconnected`));

    // Timeout to prevent VUs from hanging indefinitely.
    socket.setTimeout(() => {
      console.log(`VU ${__VU}: Timed out waiting for alert ${correlationId}`);
      socket.close();
    }, 5000);
  });

  check(res, { 'ws connection successful': (r) => r && r.status === 101 });

  sleep(1);
}
