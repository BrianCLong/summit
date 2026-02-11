import http from 'k6/http';
import { check, sleep } from 'k6';
export const options = { vus: 10, duration: '2m' };

export default function () {
  const enqueue = http.post(
    `${__ENV.URL}/api/launchRun`,
    JSON.stringify({ runbookId: 'rb-demo', tenantId: 'dev' }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${__ENV.TOKEN}`,
      },
    },
  );
  check(enqueue, { 200: (r) => r.status === 200 });

  const t0 = Date.now();
  let leased = false;
  for (let i = 0; i < 20 && !leased; i++) {
    const r = http.get(
      `${__ENV.URL}/api/runs/${enqueue.json().data.launchRun.id}`,
    );
    leased = r.json().data.run.state !== 'QUEUED';
    sleep(0.2);
  }
  const latency = Date.now() - t0;
  check(null, { 'schedule<500ms': () => latency < 500 });
}
